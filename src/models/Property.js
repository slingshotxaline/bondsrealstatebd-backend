const mongoose = require('mongoose');

const AMENITIES = [
  'Lawn', 'Drainage', 'Jacuzzi', 'Garage', 'Parking', 'Air Condition', 'Balcony',
  'Deck', 'Fencing', 'Water Supply', 'Garden', 'CCTV', 'Gym', 'Microwave',
  'Modular Kitchen', 'Swimming Pool', 'TV Cable', 'Washing Machine', 'Wifi',
  'Solar Water', 'Water Well', 'Water Tank', 'Cafeteria', 'Electricity Backup',
  'Intercom', 'Internet', 'Kids Playground', 'Lift', 'Maintenance', 'Security Staff',
  'Store Room', 'Common Room', 'Study Room', 'Laundry', 'Terrace', 'Locker/Cloak Room',
  'Dining Room', 'Doorman', 'Elevator', 'Family Room', 'Pets Allowed', 'Basement',
  'Car Garage', 'Spa', 'Unit Washer/Dryer', 'Fireplace', 'Cleaning Service',
  'Onsite Parking', 'Stunning Views', 'Ventilation', 'Gas',
];

const PROPERTY_CATEGORIES = [
  'Apartment', 'Offices', 'House', 'Land', 'Residential', 'Other', 'Building',
  'Restaurant', 'Factory / Mill', 'Commercial', 'Agricultural', 'Warehouse',
  'Shop', 'Garage', 'Hotel', 'Flat',
];

const propertySchema = new mongoose.Schema(
  {
    // Core listing info
    listingType: {
      type: String,
      enum: ['Sale', 'Rent'],
      required: [true, 'Listing type (Sale/Rent) is required'],
    },
    propertyType: {
      type: String,
      enum: ['Residential', 'Commercial'],
      required: [true, 'Property type is required'],
    },
    propertyCategory: {
      type: String,
      enum: PROPERTY_CATEGORIES,
      required: [true, 'Property category is required'],
    },

    // Location
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    area: {
      type: String,
      required: [true, 'Area is required'],
      trim: true,
    },

    // Details
    title: {
      type: String,
      required: [true, 'Property title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    priceLabel: {
      type: String,
      enum: ['Fixed', 'Negotiable', 'On Request', 'Per Month', 'Per Year'],
      default: 'Fixed',
    },

    // Amenities
    amenities: {
      type: [String],
      enum: AMENITIES,
      default: [],
    },

    // Media
    thumbnail: {
      url:      { type: String, required: [true, 'Thumbnail image is required'] },
      publicId: { type: String, required: [true, 'Thumbnail publicId is required'] },
    },
    photos: {
      type: [{
        url:      { type: String, required: true },
        publicId: { type: String, required: true },
      }],
      default: [],
    },
    youtubeUrl: {
      type: String,
      trim: true,
      default: null,
    },

    // Owner info (snapshot at submission time)
    ownerName: {
      type: String,
      required: [true, 'Owner name is required'],
    },
    ownerEmail: {
      type: String,
      required: [true, 'Owner email is required'],
    },
    ownerPhone: {
      type: String,
      required: [true, 'Owner phone is required'],
    },

    // References
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null = admin-created
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Status & flags
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for common queries
propertySchema.index({ status: 1, listingType: 1, propertyType: 1 });
propertySchema.index({ city: 1, area: 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ isFeatured: 1 });
propertySchema.index({ submittedBy: 1 });
propertySchema.index({ title: 'text', description: 'text', address: 'text' });

module.exports = mongoose.model('Property', propertySchema);
module.exports.AMENITIES = AMENITIES;
module.exports.PROPERTY_CATEGORIES = PROPERTY_CATEGORIES;
