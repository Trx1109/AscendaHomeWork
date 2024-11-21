#!/usr/bin/env node

const fetch = global.fetch;

// Base Hotel Class
class Hotel {
  constructor(
    id,
    destination_id,
    name,
    description,
    location,
    amenities,
    images,
    booking_conditions
  ) {
    this.id = id;
    this.destination_id = destination_id;
    this.name = name;
    this.description = description;
    this.location = location;
    this.amenities = amenities;
    this.images = images;
    this.booking_conditions = booking_conditions;
  }
}

// Base Supplier Class
class BaseSupplier {
  endpoint() {
    throw new Error("Endpoint must be implemented by the supplier.");
  }

  parse(data) {
    throw new Error("Parse method must be implemented by the supplier.");
  }

  async fetch() {
    const url = this.endpoint();
    const response = await fetch(url);
    const data = await response.json();
    return data.map(this.parse);
  }
}

// Acme Supplier
class Acme extends BaseSupplier {
  endpoint() {
    return "https://5f2be0b4ffc88500167b85a0.mockapi.io/suppliers/acme";
  }

  parse(dto) {
    return new Hotel(
      dto.Id,
      dto.DestinationId,
      dto.Name,
      dto.Description || "",
      {
        address: dto.Address,
        city: dto.City,
        country: dto.Country,
        lat: parseFloat(dto.Latitude) || null,
        lng: parseFloat(dto.Longitude) || null,
      },
      {
        general: dto.Facilities || [],
        room: [],
      },
      {
        rooms: [],
        site: [],
        amenities: [],
      },
      []
    );
  }
}

// Patagonia Supplier
class Patagonia extends BaseSupplier {
  endpoint() {
    return "https://5f2be0b4ffc88500167b85a0.mockapi.io/suppliers/patagonia";
  }

  parse(dto) {
    return new Hotel(
      dto.id,
      dto.destination,
      dto.name,
      dto.info || "",
      {
        address: dto.address,
        city: null,
        country: null,
        lat: parseFloat(dto.lat) || null,
        lng: parseFloat(dto.lng) || null,
      },
      {
        general: dto.amenities || [],
        room: [],
      },
      dto.images || { rooms: [], site: [], amenities: [] },
      []
    );
  }
}

// Paperflies Supplier
class Paperflies extends BaseSupplier {
  endpoint() {
    return "https://5f2be0b4ffc88500167b85a0.mockapi.io/suppliers/paperflies";
  }

  parse(dto) {
    return new Hotel(
      dto.hotel_id,
      dto.destination_id,
      dto.hotel_name,
      dto.details || "",
      {
        address: dto.location?.address || null,
        city: null,
        country: dto.location?.country || null,
        lat: null,
        lng: null,
      },
      {
        general: dto.amenities?.general || [],
        room: dto.amenities?.room || [],
      },
      dto.images || { rooms: [], site: [], amenities: [] },
      dto.booking_conditions || []
    );
  }
}

// Hotels Service
class HotelsService {
  constructor() {
    this.hotels = [];
  }

  mergeAndSave(hotels) {
    const mergedHotels = {};

    hotels.forEach((hotel) => {
      if (!mergedHotels[hotel.id]) {
        mergedHotels[hotel.id] = hotel;
      } else {
        const existing = mergedHotels[hotel.id];

        existing.name = existing.name || hotel.name;
        existing.description = existing.description || hotel.description;

        // Merge amenities
        existing.amenities.general = [
          ...new Set([
            ...existing.amenities.general,
            ...(hotel.amenities.general || []),
          ]),
        ];
        existing.amenities.room = [
          ...new Set([
            ...existing.amenities.room,
            ...(hotel.amenities.room || []),
          ]),
        ];

        // Merge images
        existing.images.rooms = [
          ...new Set([
            ...existing.images.rooms,
            ...(hotel.images?.rooms || []),
          ]),
        ];
        existing.images.site = [
          ...new Set([...existing.images.site, ...(hotel.images?.site || [])]),
        ];
        existing.images.amenities = [
          ...new Set([
            ...existing.images.amenities,
            ...(hotel.images?.amenities || []),
          ]),
        ];

        // Merge booking conditions
        existing.booking_conditions = [
          ...new Set([
            ...existing.booking_conditions,
            ...(hotel.booking_conditions || []),
          ]),
        ];
      }
    });

    this.hotels = Object.values(mergedHotels);
  }

  find(hotelIds, destinationIds) {
    return this.hotels.filter((hotel) => {
      const matchesHotelId =
        hotelIds.length === 0 || hotelIds.includes(hotel.id);
      const matchesDestinationId =
        destinationIds.length === 0 ||
        destinationIds.includes(String(hotel.destination_id));
      return matchesHotelId && matchesDestinationId;
    });
  }
}

// Main function to fetch, merge, filter, and output hotels
async function fetchHotels(hotelIds, destinationIds) {
  const suppliers = [new Acme(), new Patagonia(), new Paperflies()];

  // Fetch data from all suppliers
  let allSupplierData = [];
  for (const supplier of suppliers) {
    const data = await supplier.fetch();
    allSupplierData = allSupplierData.concat(data);
  }

  // Merge all the data
  const service = new HotelsService();
  service.mergeAndSave(allSupplierData);

  // Filter and return the result
  const filteredHotels = service.find(hotelIds, destinationIds);
  return JSON.stringify(filteredHotels, null, 2);
}

// CLI Entrypoint
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("Usage: hotelMerger.js <hotel_ids> <destination_ids>");
    process.exit(1);
  }

  const hotelIds = args[0] === "none" ? [] : args[0].split(",");
  const destinationIds = args[1] === "none" ? [] : args[1].split(",");

  const result = await fetchHotels(hotelIds, destinationIds);
  console.log(result);
}

main();
