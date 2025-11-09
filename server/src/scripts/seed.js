import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Coupon } from '../models/Coupon.js';
import { Banner } from '../models/Banner.js';

const seed = async () => {
  try {
    console.log('🌱 Starting database seed...');

    // Connect to database
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Coupon.deleteMany({}),
      Banner.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@abayahouse.com',
      passwordHash: 'admin123',
      role: 'admin',
    });
    console.log('👤 Created admin user:', admin.email);

    // Create customer users
    const customers = await User.create([
      {
        name: 'Sarah Ahmed',
        email: 'sarah@example.com',
        passwordHash: 'password123',
        phone: '+971501234567',
      },
      {
        name: 'Fatima Khan',
        email: 'fatima@example.com',
        passwordHash: 'password123',
        phone: '+971507654321',
      },
    ]);
    console.log('👥 Created customer users');

    // Create categories
    const categories = await Category.create([
      {
        name: 'Traditional Abayas',
        slug: 'traditional-abayas',
        description: 'Classic and elegant traditional abayas',
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'Modern Abayas',
        slug: 'modern-abayas',
        description: 'Contemporary designs with modern cuts',
        isActive: true,
        sortOrder: 2,
      },
      {
        name: 'Embroidered Abayas',
        slug: 'embroidered-abayas',
        description: 'Beautifully embroidered abayas',
        isActive: true,
        sortOrder: 3,
      },
      {
        name: 'Casual Abayas',
        slug: 'casual-abayas',
        description: 'Comfortable everyday abayas',
        isActive: true,
        sortOrder: 4,
      },
      {
        name: 'Occasion Abayas',
        slug: 'occasion-abayas',
        description: 'Special occasion and party abayas',
        isActive: true,
        sortOrder: 5,
      },
    ]);
    console.log('📁 Created categories');

    // Create products
    const products = [];
    const productData = [
      {
        title: 'Classic Black Abaya',
        description:
          'Elegant traditional black abaya made from premium quality fabric. Perfect for daily wear with a timeless design that never goes out of style.',
        categoryId: categories[0]._id,
        price: 1299,
        compareAtPrice: 1599,
        stock: 50,
        isFeatured: true,
        tags: ['classic', 'black', 'traditional'],
        specs: new Map([
          ['Material', 'Premium Nida'],
          ['Length', '58 inches'],
          ['Sleeve', 'Full sleeve'],
          ['Care', 'Machine washable'],
        ]),
      },
      {
        title: 'Embroidered Butterfly Abaya',
        description:
          'Beautiful abaya with intricate butterfly embroidery on the sleeves and hem. A perfect blend of tradition and elegance.',
        categoryId: categories[2]._id,
        price: 2499,
        compareAtPrice: 2999,
        stock: 30,
        isFeatured: true,
        tags: ['embroidered', 'butterfly', 'elegant'],
        specs: new Map([
          ['Material', 'Crepe'],
          ['Embroidery', 'Hand embroidered'],
          ['Length', '56 inches'],
          ['Occasion', 'Party wear'],
        ]),
      },
      {
        title: 'Modern Cut Abaya - Navy Blue',
        description:
          'Contemporary abaya with modern cuts and clean lines. Features a stylish navy blue color perfect for the modern woman.',
        categoryId: categories[1]._id,
        price: 1799,
        stock: 40,
        isFeatured: true,
        tags: ['modern', 'navy', 'contemporary'],
        specs: new Map([
          ['Material', 'Korean Nida'],
          ['Color', 'Navy Blue'],
          ['Style', 'Front open'],
          ['Fit', 'Relaxed'],
        ]),
      },
      {
        title: 'Casual Everyday Abaya - Grey',
        description:
          'Comfortable and practical abaya for everyday wear. Made from soft, breathable fabric in a versatile grey color.',
        categoryId: categories[3]._id,
        price: 999,
        stock: 60,
        tags: ['casual', 'grey', 'comfortable'],
        specs: new Map([
          ['Material', 'Cotton blend'],
          ['Color', 'Grey'],
          ['Pockets', 'Side pockets'],
          ['Comfort', 'Breathable'],
        ]),
      },
      {
        title: 'Luxury Pearl Abaya',
        description:
          'Exquisite abaya adorned with pearl detailing. Perfect for special occasions and celebrations.',
        categoryId: categories[4]._id,
        price: 3499,
        compareAtPrice: 4299,
        stock: 20,
        isFeatured: true,
        tags: ['luxury', 'pearl', 'occasion'],
        specs: new Map([
          ['Material', 'Premium Silk'],
          ['Detailing', 'Pearl embellishment'],
          ['Occasion', 'Wedding/Party'],
          ['Care', 'Dry clean only'],
        ]),
      },
      {
        title: 'Floral Print Abaya',
        description:
          'Elegant abaya with beautiful floral prints. A perfect choice for those who love subtle patterns.',
        categoryId: categories[1]._id,
        price: 1599,
        stock: 35,
        tags: ['floral', 'print', 'elegant'],
        specs: new Map([
          ['Material', 'Chiffon'],
          ['Print', 'Floral'],
          ['Lining', 'Inner lining included'],
          ['Season', 'All season'],
        ]),
      },
      {
        title: 'Kimono Style Abaya',
        description:
          'Unique kimono-style abaya with wide sleeves. A modern twist on traditional design.',
        categoryId: categories[1]._id,
        price: 2199,
        stock: 25,
        tags: ['kimono', 'modern', 'unique'],
        specs: new Map([
          ['Material', 'Linen blend'],
          ['Style', 'Kimono'],
          ['Sleeves', 'Wide sleeves'],
          ['Closure', 'Belt tie'],
        ]),
      },
      {
        title: 'Lace Trim Abaya - Beige',
        description:
          'Sophisticated beige abaya with delicate lace trim. Perfect for formal occasions.',
        categoryId: categories[4]._id,
        price: 2799,
        stock: 28,
        tags: ['lace', 'beige', 'formal'],
        specs: new Map([
          ['Material', 'Premium Crepe'],
          ['Color', 'Beige'],
          ['Trim', 'Lace detailing'],
          ['Occasion', 'Formal events'],
        ]),
      },
    ];

    for (const data of productData) {
      const product = await Product.create({
        ...data,
        images: [
          {
            url: `https://placehold.co/800x1000/000000/FFFFFF/png?text=${encodeURIComponent(data.title)}`,
            alt: data.title,
          },
        ],
        ratingsAvg: Math.random() * 2 + 3, // Random rating between 3-5
        ratingsCount: Math.floor(Math.random() * 50) + 10,
        viewCount: Math.floor(Math.random() * 500) + 100,
      });
      products.push(product);
    }
    console.log('🛍️  Created products');

    // Create coupons
    const coupons = await Coupon.create([
      {
        code: 'WELCOME10',
        type: 'percentage',
        value: 10,
        minOrder: 1000,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        active: true,
        description: 'Welcome discount for new customers',
      },
      {
        code: 'SAVE500',
        type: 'fixed',
        value: 500,
        minOrder: 3000,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        active: true,
        description: 'Flat ₹500 off on orders above ₹3000',
      },
      {
        code: 'SPECIAL20',
        type: 'percentage',
        value: 20,
        minOrder: 2000,
        maxDiscount: 1000,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        active: true,
        description: 'Special 20% off (max ₹1000)',
      },
    ]);
    console.log('🎟️  Created coupons');

    // Create banners
    const banners = await Banner.create([
      {
        title: 'New Collection Arrival',
        subtitle: 'Discover our latest designs',
        imageUrl: 'https://placehold.co/1920x600/8B4513/FFFFFF/png?text=New+Collection',
        linkUrl: '/products?category=modern-abayas',
        linkText: 'Shop Now',
        position: 'hero',
        sortOrder: 1,
        isActive: true,
      },
      {
        title: 'Special Ramadan Offer',
        subtitle: 'Up to 30% off on selected items',
        imageUrl: 'https://placehold.co/1920x600/4A5568/FFFFFF/png?text=Ramadan+Sale',
        linkUrl: '/products?featured=true',
        linkText: 'View Offers',
        position: 'hero',
        sortOrder: 2,
        isActive: true,
      },
    ]);
    console.log('🎨 Created banners');

    console.log('\n✨ Seed completed successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('   Admin: admin@abayahouse.com / admin123');
    console.log('   Customer: sarah@example.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
