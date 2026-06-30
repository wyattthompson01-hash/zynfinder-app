import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Prefer": "return=representation",
};

const SEED_STORES = [
  // New York
  { id: "s1",  name: "7-Eleven",          address: "350 W 42nd St, New York, NY",              lat: 40.7580, lng: -73.9930, type: "convenience", status: "verified",   confirmations: 18, reports: 21, flavors: ["Cool Mint","Citrus","Spearmint"],          strength: "Both", last_seen: "2026-06-28T14:00:00Z", reported_at: "2026-01-15T10:00:00Z", latest_price: 6.49,  latest_can_size: 15 },
  { id: "s2",  name: "Duane Reade",        address: "224 W 57th St, New York, NY",              lat: 40.7651, lng: -73.9799, type: "pharmacy",    status: "verified",   confirmations: 12, reports: 14, flavors: ["Cool Mint","Smooth"],                     strength: "6mg",  last_seen: "2026-06-27T11:00:00Z", reported_at: "2026-02-03T10:00:00Z", latest_price: 6.99,  latest_can_size: 15 },
  { id: "s3",  name: "BP Gas Station",     address: "112 E 34th St, New York, NY",              lat: 40.7484, lng: -73.9836, type: "gas",         status: "verified",   confirmations: 8,  reports: 10, flavors: ["Cool Mint","Wintergreen"],                strength: "Both", last_seen: "2026-06-25T09:00:00Z", reported_at: "2026-03-10T10:00:00Z", latest_price: 7.49,  latest_can_size: 15 },
  // Los Angeles
  { id: "s4",  name: "Circle K",           address: "8600 Sunset Blvd, West Hollywood, CA",     lat: 34.0904, lng: -118.3866,type: "convenience", status: "verified",   confirmations: 14, reports: 16, flavors: ["Cool Mint","Citrus","Mango"],             strength: "Both", last_seen: "2026-06-29T16:00:00Z", reported_at: "2026-01-20T10:00:00Z", latest_price: 6.29,  latest_can_size: 15 },
  { id: "s5",  name: "Chevron",            address: "4500 W Sunset Blvd, Los Angeles, CA",      lat: 34.0898, lng: -118.2951,type: "gas",         status: "verified",   confirmations: 9,  reports: 11, flavors: ["Cool Mint","Spearmint"],                  strength: "6mg",  last_seen: "2026-06-26T13:00:00Z", reported_at: "2026-02-14T10:00:00Z", latest_price: 6.79,  latest_can_size: 15 },
  // Chicago
  { id: "s6",  name: "Walgreens",          address: "30 N Michigan Ave, Chicago, IL",           lat: 41.8832, lng: -87.6249, type: "pharmacy",    status: "verified",   confirmations: 22, reports: 25, flavors: ["Cool Mint","Citrus","Coffee","Smooth"],   strength: "Both", last_seen: "2026-06-29T10:00:00Z", reported_at: "2025-12-01T10:00:00Z", latest_price: 5.99,  latest_can_size: 15 },
  { id: "s7",  name: "Mobil",              address: "1500 N Clark St, Chicago, IL",             lat: 41.9085, lng: -87.6313, type: "gas",         status: "verified",   confirmations: 7,  reports: 9,  flavors: ["Cool Mint","Wintergreen"],                strength: "3mg",  last_seen: "2026-06-24T08:00:00Z", reported_at: "2026-02-22T10:00:00Z", latest_price: 6.49,  latest_can_size: 15 },
  // Toronto
  { id: "s8",  name: "Petro-Canada",       address: "320 Bloor St W, Toronto, ON",              lat: 43.6649, lng: -79.4102, type: "gas",         status: "verified",   confirmations: 12, reports: 14, flavors: ["Cool Mint","Citrus"],                     strength: "Both", last_seen: "2026-06-20T10:00:00Z", reported_at: "2025-10-01T10:00:00Z", latest_price: 24.99, latest_can_size: 15 },
  { id: "s9",  name: "Mac's Convenience",  address: "88 College St, Toronto, ON",               lat: 43.6588, lng: -79.4008, type: "convenience", status: "verified",   confirmations: 8,  reports: 9,  flavors: ["Cool Mint","Spearmint"],                  strength: "3mg",  last_seen: "2026-06-18T14:00:00Z", reported_at: "2025-10-05T10:00:00Z", latest_price: 22.99, latest_can_size: 15 },
  { id: "s10", name: "Shell",              address: "1200 Yonge St, Toronto, ON",               lat: 43.6793, lng: -79.3889, type: "gas",         status: "pending",    confirmations: 3,  reports: 5,  flavors: ["Cool Mint"],                              strength: "6mg",  last_seen: "2026-06-15T10:00:00Z", reported_at: "2026-03-15T10:00:00Z", latest_price: 25.99, latest_can_size: 20 },
  // Vancouver
  { id: "s11", name: "7-Eleven",           address: "1045 Robson St, Vancouver, BC",            lat: 49.2830, lng: -123.1239,type: "convenience", status: "verified",   confirmations: 11, reports: 13, flavors: ["Cool Mint","Citrus","Cinnamon"],           strength: "Both", last_seen: "2026-06-28T12:00:00Z", reported_at: "2026-01-08T10:00:00Z", latest_price: 23.49, latest_can_size: 15 },
  { id: "s12", name: "Esso",               address: "675 Davie St, Vancouver, BC",              lat: 49.2769, lng: -123.1310,type: "gas",         status: "verified",   confirmations: 6,  reports: 7,  flavors: ["Cool Mint","Spearmint"],                  strength: "6mg",  last_seen: "2026-06-22T11:00:00Z", reported_at: "2026-02-10T10:00:00Z", latest_price: 24.49, latest_can_size: 15 },
  // Miami
  { id: "s13", name: "CVS Pharmacy",       address: "1001 Lincoln Rd, Miami Beach, FL",         lat: 25.7916, lng: -80.1390, type: "pharmacy",    status: "verified",   confirmations: 16, reports: 18, flavors: ["Cool Mint","Spearmint","Citrus","Mango"],  strength: "Both", last_seen: "2026-06-29T17:00:00Z", reported_at: "2026-01-25T10:00:00Z", latest_price: 5.99,  latest_can_size: 15 },
  { id: "s14", name: "Valero",             address: "3200 SW 27th Ave, Miami, FL",              lat: 25.7384, lng: -80.2358, type: "gas",         status: "pending",    confirmations: 4,  reports: 6,  flavors: ["Cool Mint"],                              strength: "6mg",  last_seen: "2026-06-19T09:00:00Z", reported_at: "2026-03-01T10:00:00Z", latest_price: 6.29,  latest_can_size: 15 },
  // Seattle
  { id: "s15", name: "Bartell Drugs",      address: "600 1st Ave, Seattle, WA",                 lat: 47.6038, lng: -122.3351,type: "pharmacy",    status: "verified",   confirmations: 10, reports: 12, flavors: ["Cool Mint","Citrus","Coffee"],             strength: "Both", last_seen: "2026-06-27T14:00:00Z", reported_at: "2026-02-01T10:00:00Z", latest_price: 6.49,  latest_can_size: 15 },
  { id: "s16", name: "76 Gas Station",     address: "400 Pine St, Seattle, WA",                 lat: 47.6144, lng: -122.3384,type: "gas",         status: "verified",   confirmations: 7,  reports: 8,  flavors: ["Cool Mint","Wintergreen"],                strength: "6mg",  last_seen: "2026-06-25T10:00:00Z", reported_at: "2026-02-18T10:00:00Z", latest_price: 6.99,  latest_can_size: 15 },
  // Boston
  { id: "s17", name: "Rite Aid",           address: "24 School St, Boston, MA",                 lat: 42.3585, lng: -71.0577, type: "pharmacy",    status: "verified",   confirmations: 13, reports: 15, flavors: ["Cool Mint","Spearmint","Smooth"],          strength: "Both", last_seen: "2026-06-28T11:00:00Z", reported_at: "2026-01-30T10:00:00Z", latest_price: 6.29,  latest_can_size: 15 },
  { id: "s18", name: "Gulf Gas",           address: "700 Boylston St, Boston, MA",              lat: 42.3502, lng: -71.0808, type: "gas",         status: "pending",    confirmations: 2,  reports: 4,  flavors: ["Cool Mint"],                              strength: "3mg",  last_seen: "2026-06-10T10:00:00Z", reported_at: "2026-04-02T10:00:00Z", latest_price: 6.79,  latest_can_size: 15 },
  // Denver
  { id: "s19", name: "King Soopers",       address: "2000 E Colfax Ave, Denver, CO",            lat: 39.7407, lng: -104.9629,type: "convenience", status: "verified",   confirmations: 9,  reports: 11, flavors: ["Cool Mint","Citrus","Cinnamon","Coffee"], strength: "Both", last_seen: "2026-06-28T13:00:00Z", reported_at: "2026-02-05T10:00:00Z", latest_price: 5.79,  latest_can_size: 15 },
  // Austin
  { id: "s20", name: "H-E-B",             address: "1000 E 41st St, Austin, TX",               lat: 30.3083, lng: -97.7181, type: "convenience", status: "verified",   confirmations: 19, reports: 22, flavors: ["Cool Mint","Citrus","Mango","Smooth","Spearmint"], strength: "Both", last_seen: "2026-06-29T15:00:00Z", reported_at: "2025-11-15T10:00:00Z", latest_price: 5.49, latest_can_size: 15 },
  { id: "s21", name: "Exxon",             address: "2500 S Lamar Blvd, Austin, TX",            lat: 30.2565, lng: -97.7695, type: "gas",         status: "verified",   confirmations: 8,  reports: 10, flavors: ["Cool Mint","Wintergreen"],                strength: "6mg",  last_seen: "2026-06-26T09:00:00Z", reported_at: "2026-01-10T10:00:00Z", latest_price: 5.99,  latest_can_size: 15 },
  // Montreal
  { id: "s22", name: "Couche-Tard",        address: "1500 Rue Sainte-Catherine, Montréal, QC",  lat: 45.5162, lng: -73.5784, type: "convenience", status: "verified",   confirmations: 10, reports: 12, flavors: ["Cool Mint","Citrus","Spearmint"],          strength: "Both", last_seen: "2026-06-27T13:00:00Z", reported_at: "2026-01-12T10:00:00Z", latest_price: 23.99, latest_can_size: 15 },
  { id: "s23", name: "Ultramar",           address: "800 Boul. de Maisonneuve, Montréal, QC",   lat: 45.5107, lng: -73.5684, type: "gas",         status: "pending",    confirmations: 3,  reports: 5,  flavors: ["Cool Mint"],                              strength: "6mg",  last_seen: "2026-06-14T10:00:00Z", reported_at: "2026-03-20T10:00:00Z", latest_price: 24.49, latest_can_size: 15 },
  // Calgary
  { id: "s24", name: "Co-op Gas Bar",      address: "850 16 Ave NW, Calgary, AB",               lat: 51.0620, lng: -114.0889,type: "gas",         status: "verified",   confirmations: 7,  reports: 8,  flavors: ["Cool Mint","Spearmint"],                  strength: "Both", last_seen: "2026-06-25T11:00:00Z", reported_at: "2026-02-08T10:00:00Z", latest_price: 24.99, latest_can_size: 15 },
  // London
  { id: "s25", name: "Sainsbury's Local",  address: "204 Tottenham Court Rd, London W1T",       lat: 51.5200, lng: -0.1357,  type: "convenience", status: "verified",   confirmations: 21, reports: 24, flavors: ["Cool Mint","Spearmint","Citrus","Smooth"], strength: "Both", last_seen: "2026-06-29T18:00:00Z", reported_at: "2025-11-20T10:00:00Z", latest_price: 8.49,  latest_can_size: 20 },
  { id: "s26", name: "BP Garage",          address: "100 Baker St, London NW1",                 lat: 51.5224, lng: -0.1574,  type: "gas",         status: "verified",   confirmations: 14, reports: 16, flavors: ["Cool Mint","Citrus"],                     strength: "6mg",  last_seen: "2026-06-28T10:00:00Z", reported_at: "2025-12-10T10:00:00Z", latest_price: 8.99,  latest_can_size: 20 },
  { id: "s27", name: "Tesco Express",      address: "10 Brick Ln, London E1",                   lat: 51.5222, lng: -0.0721,  type: "convenience", status: "verified",   confirmations: 11, reports: 13, flavors: ["Cool Mint","Smooth","Coffee"],             strength: "Both", last_seen: "2026-06-27T15:00:00Z", reported_at: "2026-01-05T10:00:00Z", latest_price: 8.29,  latest_can_size: 20 },
  // Stockholm
  { id: "s28", name: "Pressbyrån",         address: "Drottninggatan 55, 111 21 Stockholm",      lat: 59.3340, lng: 18.0656,  type: "convenience", status: "verified",   confirmations: 28, reports: 31, flavors: ["Cool Mint","Spearmint","Citrus","Smooth","Coffee"], strength: "Both", last_seen: "2026-06-29T16:00:00Z", reported_at: "2025-10-15T10:00:00Z", latest_price: 11.99, latest_can_size: 20 },
  { id: "s29", name: "7-Eleven",           address: "Sveavägen 18, 111 57 Stockholm",           lat: 59.3384, lng: 18.0601,  type: "convenience", status: "verified",   confirmations: 23, reports: 26, flavors: ["Cool Mint","Citrus","Cinnamon","Smooth"],  strength: "Both", last_seen: "2026-06-29T14:00:00Z", reported_at: "2025-11-01T10:00:00Z", latest_price: 12.49, latest_can_size: 20 },
  { id: "s30", name: "OKQ8",              address: "Fleminggatan 41, 112 32 Stockholm",        lat: 59.3329, lng: 18.0368,  type: "gas",         status: "verified",   confirmations: 16, reports: 18, flavors: ["Cool Mint","Spearmint"],                  strength: "6mg",  last_seen: "2026-06-28T09:00:00Z", reported_at: "2025-12-05T10:00:00Z", latest_price: 11.49, latest_can_size: 20 },
  // Oslo
  { id: "s31", name: "Narvesen",           address: "Karl Johans gate 8, 0154 Oslo",            lat: 59.9127, lng: 10.7462,  type: "convenience", status: "verified",   confirmations: 17, reports: 20, flavors: ["Cool Mint","Citrus","Spearmint","Smooth"], strength: "Both", last_seen: "2026-06-29T13:00:00Z", reported_at: "2025-11-25T10:00:00Z", latest_price: 13.99, latest_can_size: 20 },
  { id: "s32", name: "Circle K",           address: "Storgata 5, 0155 Oslo",                    lat: 59.9109, lng: 10.7530,  type: "gas",         status: "verified",   confirmations: 12, reports: 14, flavors: ["Cool Mint","Citrus"],                     strength: "6mg",  last_seen: "2026-06-27T11:00:00Z", reported_at: "2025-12-15T10:00:00Z", latest_price: 14.49, latest_can_size: 20 },
  // Copenhagen
  { id: "s33", name: "7-Eleven",           address: "Nørre Voldgade 16, 1358 Copenhagen",       lat: 55.6826, lng: 12.5720,  type: "convenience", status: "verified",   confirmations: 13, reports: 15, flavors: ["Cool Mint","Spearmint","Citrus"],          strength: "Both", last_seen: "2026-06-28T14:00:00Z", reported_at: "2026-01-03T10:00:00Z", latest_price: 10.99, latest_can_size: 20 },
  { id: "s34", name: "Q8 Energy",          address: "Vesterbrogade 40, 1620 Copenhagen",        lat: 55.6736, lng: 12.5620,  type: "gas",         status: "verified",   confirmations: 9,  reports: 11, flavors: ["Cool Mint","Smooth"],                     strength: "6mg",  last_seen: "2026-06-25T10:00:00Z", reported_at: "2026-01-18T10:00:00Z", latest_price: 11.49, latest_can_size: 20 },
  // Helsinki
  { id: "s35", name: "K-Market",           address: "Mannerheimintie 14, 00100 Helsinki",       lat: 60.1680, lng: 24.9335,  type: "convenience", status: "verified",   confirmations: 11, reports: 13, flavors: ["Cool Mint","Spearmint","Citrus","Coffee"], strength: "Both", last_seen: "2026-06-28T16:00:00Z", reported_at: "2026-01-10T10:00:00Z", latest_price: 10.49, latest_can_size: 20 },
  { id: "s36", name: "ABC",               address: "Hämeentie 12, 00530 Helsinki",             lat: 60.1901, lng: 24.9482,  type: "gas",         status: "pending",    confirmations: 4,  reports: 6,  flavors: ["Cool Mint","Citrus"],                     strength: "6mg",  last_seen: "2026-06-18T09:00:00Z", reported_at: "2026-02-20T10:00:00Z", latest_price: 10.99, latest_can_size: 20 },
  // Amsterdam
  { id: "s37", name: "Albert Heijn",       address: "Kalverstraat 32, 1012 NX Amsterdam",       lat: 52.3740, lng: 4.8945,   type: "convenience", status: "verified",   confirmations: 15, reports: 17, flavors: ["Cool Mint","Spearmint","Citrus","Smooth"], strength: "Both", last_seen: "2026-06-29T12:00:00Z", reported_at: "2025-12-20T10:00:00Z", latest_price: 9.49,  latest_can_size: 20 },
  { id: "s38", name: "Shell",              address: "Overtoom 15, 1054 HG Amsterdam",           lat: 52.3614, lng: 4.8742,   type: "gas",         status: "verified",   confirmations: 8,  reports: 10, flavors: ["Cool Mint","Citrus"],                     strength: "6mg",  last_seen: "2026-06-26T10:00:00Z", reported_at: "2026-01-25T10:00:00Z", latest_price: 9.99,  latest_can_size: 20 },
  // Berlin
  { id: "s39", name: "Kiosk",             address: "Friedrichstraße 101, 10117 Berlin",        lat: 52.5170, lng: 13.3880,  type: "convenience", status: "verified",   confirmations: 14, reports: 16, flavors: ["Cool Mint","Spearmint","Citrus","Cinnamon"],strength: "Both", last_seen: "2026-06-29T14:00:00Z", reported_at: "2026-01-02T10:00:00Z", latest_price: 8.99,  latest_can_size: 20 },
  { id: "s40", name: "Aral",              address: "Potsdamer Straße 2, 10785 Berlin",         lat: 52.5078, lng: 13.3680,  type: "gas",         status: "pending",    confirmations: 3,  reports: 5,  flavors: ["Cool Mint"],                              strength: "6mg",  last_seen: "2026-06-16T11:00:00Z", reported_at: "2026-03-10T10:00:00Z", latest_price: 9.49,  latest_can_size: 20 },
  // Dublin
  { id: "s41", name: "Spar",              address: "12 O'Connell St, Dublin 1",               lat: 53.3502, lng: -6.2605,  type: "convenience", status: "verified",   confirmations: 10, reports: 12, flavors: ["Cool Mint","Spearmint","Citrus"],          strength: "Both", last_seen: "2026-06-28T13:00:00Z", reported_at: "2026-01-20T10:00:00Z", latest_price: 9.99,  latest_can_size: 20 },
  { id: "s42", name: "Circle K",          address: "50 Baggot St Upper, Dublin 4",            lat: 53.3328, lng: -6.2472,  type: "gas",         status: "verified",   confirmations: 7,  reports: 9,  flavors: ["Cool Mint","Smooth"],                     strength: "6mg",  last_seen: "2026-06-24T10:00:00Z", reported_at: "2026-02-05T10:00:00Z", latest_price: 10.49, latest_can_size: 20 },
  // Zurich
  { id: "s43", name: "Migros",            address: "Bahnhofstrasse 18, 8001 Zürich",           lat: 47.3780, lng: 8.5404,   type: "convenience", status: "verified",   confirmations: 9,  reports: 11, flavors: ["Cool Mint","Spearmint","Citrus","Coffee"], strength: "Both", last_seen: "2026-06-27T15:00:00Z", reported_at: "2026-01-28T10:00:00Z", latest_price: 11.49, latest_can_size: 20 },
  // Tokyo
  { id: "s44", name: "Lawson",            address: "1-1 Shinjuku, Shinjuku-ku, Tokyo",         lat: 35.6895, lng: 139.6917, type: "convenience", status: "verified",   confirmations: 8,  reports: 10, flavors: ["Cool Mint","Spearmint"],                  strength: "6mg",  last_seen: "2026-06-28T10:00:00Z", reported_at: "2026-02-15T10:00:00Z", latest_price: 9.99,  latest_can_size: 20 },
  { id: "s45", name: "FamilyMart",        address: "2-8-1 Roppongi, Minato-ku, Tokyo",         lat: 35.6630, lng: 139.7320, type: "convenience", status: "pending",    confirmations: 4,  reports: 6,  flavors: ["Cool Mint"],                              strength: "3mg",  last_seen: "2026-06-20T08:00:00Z", reported_at: "2026-03-05T10:00:00Z", latest_price: 10.49, latest_can_size: 20 },
  // Seoul
  { id: "s46", name: "GS25",             address: "15 Myeongdong-gil, Jung-gu, Seoul",         lat: 37.5636, lng: 126.9850, type: "convenience", status: "verified",   confirmations: 11, reports: 13, flavors: ["Cool Mint","Citrus","Spearmint"],          strength: "Both", last_seen: "2026-06-29T11:00:00Z", reported_at: "2026-01-22T10:00:00Z", latest_price: 8.99,  latest_can_size: 20 },
  { id: "s47", name: "CU",               address: "50 Hongdae-ro, Mapo-gu, Seoul",             lat: 37.5572, lng: 126.9232, type: "convenience", status: "verified",   confirmations: 8,  reports: 9,  flavors: ["Cool Mint","Smooth"],                     strength: "6mg",  last_seen: "2026-06-27T14:00:00Z", reported_at: "2026-02-10T10:00:00Z", latest_price: 9.49,  latest_can_size: 20 },
  // Sydney
  { id: "s48", name: "7-Eleven",          address: "388 George St, Sydney NSW 2000",            lat: -33.8715,lng: 151.2069, type: "convenience", status: "verified",   confirmations: 10, reports: 12, flavors: ["Cool Mint","Spearmint","Citrus"],          strength: "Both", last_seen: "2026-06-29T08:00:00Z", reported_at: "2026-01-15T10:00:00Z", latest_price: 13.99, latest_can_size: 20 },
  { id: "s49", name: "Ampol",             address: "100 Crown St, Sydney NSW 2010",             lat: -33.8853,lng: 151.2092, type: "gas",         status: "verified",   confirmations: 7,  reports: 8,  flavors: ["Cool Mint","Citrus"],                     strength: "6mg",  last_seen: "2026-06-25T09:00:00Z", reported_at: "2026-02-08T10:00:00Z", latest_price: 14.49, latest_can_size: 20 },
  // Dubai
  { id: "s50", name: "ENOC Station",      address: "Sheikh Zayed Rd, Dubai",                   lat: 25.1985, lng: 55.2796,  type: "gas",         status: "verified",   confirmations: 9,  reports: 11, flavors: ["Cool Mint","Spearmint","Citrus"],          strength: "Both", last_seen: "2026-06-28T12:00:00Z", reported_at: "2026-01-30T10:00:00Z", latest_price: 10.99, latest_can_size: 20 },
  { id: "s51", name: "Spinneys",          address: "The Dubai Mall, Dubai",                    lat: 25.1972, lng: 55.2744,  type: "convenience", status: "verified",   confirmations: 13, reports: 15, flavors: ["Cool Mint","Smooth","Citrus","Coffee"],   strength: "Both", last_seen: "2026-06-29T15:00:00Z", reported_at: "2025-12-20T10:00:00Z", latest_price: 11.49, latest_can_size: 20 },
  // Cape Town
  { id: "s52", name: "Woolworths Food",   address: "V&A Waterfront, Cape Town",                lat: -33.9019,lng: 18.4225,  type: "convenience", status: "pending",    confirmations: 2,  reports: 4,  flavors: ["Cool Mint"],                              strength: "6mg",  last_seen: "2026-06-12T10:00:00Z", reported_at: "2026-04-01T10:00:00Z", latest_price: 12.99, latest_can_size: 20 },
  // São Paulo
  { id: "s53", name: "Posto Ipiranga",    address: "Av. Paulista 1000, São Paulo, SP",          lat: -23.5629,lng: -46.6544, type: "gas",         status: "pending",    confirmations: 3,  reports: 5,  flavors: ["Cool Mint","Spearmint"],                  strength: "6mg",  last_seen: "2026-06-15T10:00:00Z", reported_at: "2026-03-25T10:00:00Z", latest_price: 11.99, latest_can_size: 20 },
  { id: "s54", name: "Carrefour Express", address: "Rua Augusta 1000, São Paulo, SP",           lat: -23.5539,lng: -46.6644, type: "convenience", status: "unverified", confirmations: 1,  reports: 2,  flavors: ["Cool Mint"],                              strength: "3mg",  last_seen: null,                   reported_at: "2026-05-10T10:00:00Z", latest_price: null,  latest_can_size: 15 },
  // Singapore
  { id: "s55", name: "7-Eleven",          address: "1 Orchard Turn, Singapore 238801",          lat: 1.3040,  lng: 103.8318, type: "convenience", status: "verified",   confirmations: 12, reports: 14, flavors: ["Cool Mint","Spearmint","Citrus","Smooth"], strength: "Both", last_seen: "2026-06-29T10:00:00Z", reported_at: "2026-01-08T10:00:00Z", latest_price: 10.49, latest_can_size: 20 },
  // Auckland
  { id: "s56", name: "Z Energy",          address: "10 Federal St, Auckland CBD 1010",          lat: -36.8495,lng: 174.7633, type: "gas",         status: "verified",   confirmations: 6,  reports: 7,  flavors: ["Cool Mint","Citrus"],                     strength: "6mg",  last_seen: "2026-06-26T09:00:00Z", reported_at: "2026-02-20T10:00:00Z", latest_price: 14.99, latest_can_size: 20 },
];

// Worldwide geocoding — no country restriction
async function geocodeAddress(address) {
  try {
    const query = encodeURIComponent(address);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      { headers: { "Accept-Language": "en", "User-Agent": "SnusWorld/1.0" } }
    );
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { return null; }
}

export function useStores(coords) {
  const [stores, setStores] = useState(SEED_STORES);
  const [loading, setLoading] = useState(false);

  const fetchStores = useCallback(async () => {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/stores?status=neq.gone&order=reported_at.desc&limit=500`,
        { headers }
      );
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      // Only replace seed data if Supabase has a meaningful number of real stores
      if (data.length >= 10) setStores(data);
    } catch (err) {
      console.warn("Using seed data:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const addStore = useCallback(async (storeData) => {
    let lat = storeData.lat;
    let lng = storeData.lng;

    const geo = await geocodeAddress(storeData.address);
    if (geo) { lat = geo.lat; lng = geo.lng; }

    const optimistic = {
      id: `temp-${Date.now()}`,
      ...storeData, lat, lng,
      status: "unverified", confirmations: 0, reports: 1,
      latest_price: storeData.price ? parseFloat(storeData.price) : null,
      latest_can_size: storeData.canSize || 15,
    };
    setStores((prev) => [optimistic, ...prev]);

    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/stores`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: storeData.name,
          address: storeData.address,
          lat, lng,
          type: storeData.type,
          flavors: storeData.flavors,
          strength: storeData.strength,
          notes: storeData.notes,
          status: "unverified",
          confirmations: 0,
          reports: 1,
          latest_price: storeData.price ? parseFloat(storeData.price) : null,
          latest_can_size: storeData.canSize || 15,
        }),
      });
      if (res.ok) {
        const [created] = await res.json();
        setStores((prev) => prev.map((s) => s.id === optimistic.id ? created : s));

        // Also insert into prices table if a price was provided
        if (storeData.price && created?.id) {
          await fetch(`${SUPABASE_URL}/rest/v1/prices`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              store_id: created.id,
              price: parseFloat(storeData.price),
              can_size: storeData.canSize || 15,
            }),
          });
        }
      }
    } catch (err) { console.warn("Saved locally:", err.message); }
  }, []);

  const verifyStore = useCallback(async (storeId, confirmed) => {
    setStores((prev) =>
      prev.map((s) => {
        if (s.id !== storeId) return s;
        const confirmations = confirmed ? s.confirmations + 1 : s.confirmations;
        const reports = s.reports + 1;
        const status = confirmations >= 3 ? "verified" : (reports - confirmations) >= 3 ? "gone" : "pending";
        return { ...s, confirmations, reports, status, last_seen: confirmed ? new Date().toISOString() : s.last_seen };
      })
    );
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/verifications`, {
        method: "POST", headers,
        body: JSON.stringify({ store_id: storeId, confirmed }),
      });
      const res = await fetch(`${SUPABASE_URL}/rest/v1/verifications?store_id=eq.${storeId}&select=confirmed`, { headers });
      const verifs = await res.json();
      const yesCount = verifs.filter((v) => v.confirmed).length;
      const noCount  = verifs.filter((v) => !v.confirmed).length;
      const newStatus = yesCount >= 3 ? "verified" : noCount >= 3 && noCount > yesCount ? "gone" : "pending";
      await fetch(`${SUPABASE_URL}/rest/v1/stores?id=eq.${storeId}`, {
        method: "PATCH", headers,
        body: JSON.stringify({
          confirmations: yesCount,
          reports: verifs.length,
          status: newStatus,
          ...(confirmed ? { last_seen: new Date().toISOString() } : {}),
        }),
      });
    } catch (err) { console.warn("Verify saved locally:", err.message); }
  }, []);

  // Call this after submitting a price so the store list reflects the new price immediately
  const updateStorePrice = useCallback((storeId, price, canSize) => {
    setStores((prev) =>
      prev.map((s) => s.id === storeId || String(s.id) === String(storeId)
        ? { ...s, latest_price: price, latest_can_size: canSize }
        : s
      )
    );
  }, []);

  return { stores, loading, addStore, verifyStore, fetchStores, updateStorePrice };
}
