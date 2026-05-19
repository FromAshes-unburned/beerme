require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const breweryRoutes = require('./routes/breweries');
const orderRoutes = require('./routes/orders');
const driverRoutes = require('./routes/drivers');
const webhookRoutes = require('./routes/webhooks');

const app = express();
const httpServer = createServer(app);

// Socket.io for real-time order tracking
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
// Raw body for Stripe webhooks (must come before express.json)
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());

// Attach io to requests so routes can emit events
app.use((req, res, next) => { req.io = io; next(); });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/breweries', breweryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/webhooks', webhookRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Socket.io rooms: one per order for live tracking
io.on('connection', (socket) => {
  socket.on('join_order', (orderId) => {
    socket.join(`order_${orderId}`);
  });
  // Driver sends location updates
  socket.on('driver_location', ({ orderId, lat, lng }) => {
    io.to(`order_${orderId}`).emit('location_update', { lat, lng });
  });
  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Beer Me API running on port ${PORT}`);
});
