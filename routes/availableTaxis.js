const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const Taxi = require('../models/Taxi');
const Booking = require('../models/Booking');
const { body, validationResult } = require('express-validator');

// Input validation rules
const searchValidation = [
    body('pickup').trim().notEmpty().withMessage('Pickup location is required'),
    body('drop').trim().notEmpty().withMessage('Drop location is required'),
    body('date').optional().isISO8601().withMessage('Invalid date format'),
    body('time').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format (HH:MM)'),
    body('passengers').optional().isInt({ min: 1, max: 6 }).withMessage('Passengers must be between 1-6')
];

/**
 * @route POST /api/availableTaxis
 * @desc Search for available taxis based on criteria
 * @access Private (authenticated users)
 * @param {string} pickup - Pickup location
 * @param {string} drop - Drop location
 * @param {string} [date] - Booking date (optional)
 * @param {string} [time] - Booking time (optional)
 * @param {number} [passengers] - Number of passengers (optional)
 * @returns {Object} List of available taxis matching criteria
 */
router.post('/', authenticateJWT, searchValidation, async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { pickup, drop, date, time, passengers = 1 } = req.body;

        // Base query for matching taxis
        const taxiQuery = {
            status: 'available',
            $and: [
                {
                    $or: [
                        { sourceLocation: { $regex: new RegExp(pickup.trim(), 'i') } },
                        { sourceLocation: { $regex: new RegExp(pickup.trim().replace(/\s+/g, '.*'), 'i') } }
                    ]
                },
                {
                    $or: [
                        { destinationLocation: { $regex: new RegExp(drop.trim(), 'i') } },
                        { destinationLocation: { $regex: new RegExp(drop.trim().replace(/\s+/g, '.*'), 'i') } }
                    ]
                },
                { capacity: { $gte: passengers } }
            ]
        };

        // Find matching taxis
        let taxis = await Taxi.find(taxiQuery)
            .sort({ capacity: 1 }) // Sort by capacity ascending
            .lean();

        // If date and time are provided, check for bookings
        if (date && time) {
            const bookingDateTime = new Date(`${date}T${time}:00`);
            
            // Validate booking is in the future
            if (bookingDateTime <= new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'Booking time must be in the future'
                });
            }

            // Find overlapping bookings
            const overlappingBookings = await Booking.find({
                $or: [
                    { status: 'confirmed' },
                    { status: 'in-progress' }
                ],
                date: date,
                time: time
            });

            // Filter out booked taxis
            const bookedTaxiIds = overlappingBookings.map(b => b.taxiId);
            taxis = taxis.filter(taxi => !bookedTaxiIds.includes(taxi._id.toString()));
        }

        // Enhance taxi data with additional information
        const enhancedTaxis = taxis.map(taxi => ({
            ...taxi,
            estimatedTime: calculateEstimatedTime(taxi.sourceLocation, taxi.destinationLocation),
            estimatedPrice: calculateEstimatedPrice(taxi, passengers)
        }));

        res.json({
            success: true,
            count: enhancedTaxis.length,
            taxis: enhancedTaxis
        });

    } catch (error) {
        console.error('Error fetching available taxis:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching taxis',
            error: error.message
        });
    }
});

// Helper function to calculate estimated time (in minutes)
function calculateEstimatedTime(source, destination) {
    // In a real implementation, use a distance API
    const distance = getDistanceBetweenLocations(source, destination); // Mock function
    const averageSpeed = 30; // km/h
    return Math.round((distance / averageSpeed) * 60); // Convert to minutes
}

// Helper function to calculate estimated price
function calculateEstimatedPrice(taxi, passengers) {
    const basePrice = 500; // Base price per trip
    const pricePerKm = 20; // Price per kilometer
    const distance = getDistanceBetweenLocations(taxi.sourceLocation, taxi.destinationLocation);
    return basePrice + (pricePerKm * distance) * passengers;
}

// Mock function to calculate distance between locations
function getDistanceBetweenLocations(source, destination) {
    // This would be replaced with actual distance calculation
    // Using simple mock values for demonstration
    const locationDistances = {
        'Chennai Airport-VIT Chennai': 15,
        'Chennai Central-VIT Chennai': 10,
        'default': 12
    };
    
    const key = `${source}-${destination}`;
    return locationDistances[key] || locationDistances['default'];
}

module.exports = router;