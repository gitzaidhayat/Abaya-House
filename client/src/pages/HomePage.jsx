import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/axios';
import { formatPrice, calculateDiscount } from '../lib/utils';
import { ArrowRight, Star } from 'lucide-react';

export default function HomePage() {
  const { data: featured } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const { data } = await api.get('/products/featured/list?limit=8');
      return data.products;
    },
  });

  const { data: bestsellers } = useQuery({
    queryKey: ['products', 'bestsellers'],
    queryFn: async () => {
      const { data } = await api.get('/products/bestsellers/list?limit=8');
      return data.products;
    },
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary/10 to-primary/5 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold mb-6">
              Discover Elegant <br />
              <span className="text-primary">Modest Fashion</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Premium abayas crafted with care. Tradition meets modern elegance.
            </p>
            <div className="flex space-x-4">
              <Link
                to="/products"
                className="px-8 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors inline-flex items-center space-x-2"
              >
                <span>Shop Now</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/products?featured=true"
                className="px-8 py-3 border border-primary text-primary rounded-md font-medium hover:bg-primary/10 transition-colors"
              >
                View Featured
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Traditional', slug: 'traditional-abayas', color: 'bg-amber-100' },
              { name: 'Modern', slug: 'modern-abayas', color: 'bg-blue-100' },
              { name: 'Embroidered', slug: 'embroidered-abayas', color: 'bg-purple-100' },
              { name: 'Casual', slug: 'casual-abayas', color: 'bg-green-100' },
            ].map(category => (
              <Link
                key={category.slug}
                to={`/products?category=${category.slug}`}
                className="group"
              >
                <div className={`${category.color} rounded-lg p-8 text-center transition-transform group-hover:scale-105`}>
                  <h3 className="text-xl font-semibold">{category.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featured && featured.length > 0 && (
        <section className="py-16 bg-muted/40">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Featured Products</h2>
              <Link to="/products?featured=true" className="text-primary hover:underline">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map(product => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Best Sellers */}
      {bestsellers && bestsellers.length > 0 && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Best Sellers</h2>
              <Link to="/products" className="text-primary hover:underline">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestsellers.map(product => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Join Our Community</h2>
          <p className="text-xl mb-8 opacity-90">
            Get exclusive offers and updates on new collections
          </p>
          <div className="flex justify-center">
            <input
              type="email"
              placeholder="Enter your email"
              className="px-6 py-3 rounded-l-md w-80 text-foreground"
            />
            <button className="px-8 py-3 bg-background text-foreground rounded-r-md font-medium hover:bg-background/90 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductCard({ product }) {
  const discount = calculateDiscount(product.price, product.compareAtPrice);

  return (
    <Link to={`/products/${product.slug}`} className="group">
      <div className="bg-card border rounded-lg overflow-hidden transition-shadow hover:shadow-lg">
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <img
            src={product.images[0]?.url}
            alt={product.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          {discount > 0 && (
            <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-2 py-1 rounded-md text-sm font-medium">
              {discount}% OFF
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
          <div className="flex items-center space-x-1 mb-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{product.ratingsAvg?.toFixed(1) || '0.0'}</span>
            <span className="text-sm text-muted-foreground">({product.ratingsCount || 0})</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold">{formatPrice(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
