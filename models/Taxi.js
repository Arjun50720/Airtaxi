const mongoose = require('mongoose');

const TaxiSchema = new mongoose.Schema({
    vehicleModel: { 
        type: String, 
        required: true,
        enum: ['AirTaxi X1', 'SkyCab S2', 'UrbanFlyer U3', 'Premium P4'], // Example models
        trim: true
    },
    licensePlate: { 
        type: String, 
        required: true, 
        unique: true,
        uppercase: true,
        trim: true,
        match: [/^[A-Z]{2,3}-\d{3,4}$/, 'Please enter a valid license plate (e.g., DL-1234 or MH-ABC-1234)']
    },
    capacity: { 
        type: Number, 
        required: true,
        min: 1,
        max: 6
    },
    status: { 
        type: String, 
        enum: ['available', 'unavailable', 'booked', 'maintenance'], 
        default: 'available',
        index: true // Add index for better query performance
    },
    sourceLocation: { 
        type: String, 
        required: true,
        trim: true
    },
    destinationLocation: { 
        type: String, 
        required: true,
        trim: true
    },
    pricePerKm: {
        type: Number,
        required: true,
        min: 10
    },
    currentLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            index: '2dsphere'
        },
        address: String
    },
    availableRoutes: [{
        source: String,
        destination: String,
        distance: Number, // in km
        basePrice: Number
    }],
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
    },
    lastMaintenance: Date,
    nextMaintenance: Date,
    createdAt: { 
        type: Date, 
        default: Date.now,
        immutable: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Add index for frequently queried fields
TaxiSchema.index({ sourceLocation: 1, destinationLocation: 1, status: 1 });

// Update the updatedAt field before saving
TaxiSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Static method to find available taxis
TaxiSchema.statics.findAvailable = function(source, destination, capacity, dateTime) {
    return this.find({
        status: 'available',
        sourceLocation: new RegExp(source, 'i'),
        destinationLocation: new RegExp(destination, 'i'),
        capacity: { $gte: capacity }
    });
};

// Method to calculate estimated price
TaxiSchema.methods.calculatePrice = function(passengers) {
    return this.pricePerKm * 0.5 * passengers; // Example calculation
};

module.exports = mongoose.model('Taxi', TaxiSchema);