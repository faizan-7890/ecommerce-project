const { ClerkExpressRequireAuth, clerkClient } = require('@clerk/clerk-sdk-node');
const { prisma } = require('../config/db');
const bcrypt = require('bcryptjs');

const protect = [
  ClerkExpressRequireAuth(),
  async (req, res, next) => {
    try {
      const clerkId = req.auth.userId;
      if (!clerkId) {
        return res.status(401).json({ message: 'Not authorized, no Clerk ID' });
      }

      // Find user by clerkId
      let user = await prisma.user.findUnique({
        where: { clerkId },
        include: { role: true },
      });

      if (!user) {
        // Fallback: Check if user exists by email, if so link clerkId. Otherwise create.
        const clerkUser = await clerkClient.users.getUser(clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;

        if (!email) {
          return res.status(400).json({ message: 'Clerk user has no email address' });
        }

        user = await prisma.user.findUnique({
          where: { email },
          include: { role: true },
        });

        if (user) {
          // Link existing user
          user = await prisma.user.update({
            where: { id: user.id },
            data: { clerkId },
            include: { role: true },
          });
        } else {
          // Create new user (default CUSTOMER role)
          let customerRole = await prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
          if (!customerRole) {
             customerRole = await prisma.role.create({ data: { name: 'CUSTOMER' } });
          }
          
          user = await prisma.user.create({
            data: {
              clerkId,
              email,
              name: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim() : 'New User',
              password: await bcrypt.hash(clerkId + (process.env.JWT_SECRET || 'secret'), 10), // dummy password
              roleId: customerRole.id,
              emailVerified: true,
            },
            include: { role: true },
          });
          
          // Create empty cart for new user
          await prisma.cart.create({
            data: { userId: user.id },
          });
        }
      }

      req.user = user;
      return next();
    } catch (error) {
      console.error('Auth error in Clerk mapping:', error);
      return res.status(401).json({ message: 'Not authorized, mapping failed' });
    }
  }
];

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role && req.user.role.name === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

module.exports = { protect, isAdmin };
