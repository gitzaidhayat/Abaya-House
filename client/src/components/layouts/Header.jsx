import { Link } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { useEffect } from 'react';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { cart, fetchCart } = useCartStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  const cartItemsCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold">Abaya House</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
              Home
            </Link>
            <Link to="/products" className="text-sm font-medium hover:text-primary transition-colors">
              Products
            </Link>
            <Link to="/products?category=traditional-abayas" className="text-sm font-medium hover:text-primary transition-colors">
              Traditional
            </Link>
            <Link to="/products?category=modern-abayas" className="text-sm font-medium hover:text-primary transition-colors">
              Modern
            </Link>
            <Link to="/products?featured=true" className="text-sm font-medium hover:text-primary transition-colors">
              Featured
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-accent rounded-md transition-colors">
              <Search className="h-5 w-5" />
            </button>

            {isAuthenticated ? (
              <>
                <Link to="/cart" className="relative p-2 hover:bg-accent rounded-md transition-colors">
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartItemsCount}
                    </span>
                  )}
                </Link>

                <div className="relative group">
                  <button className="p-2 hover:bg-accent rounded-md transition-colors">
                    <User className="h-5 w-5" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-popover border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="p-2">
                      <p className="text-sm font-medium px-2 py-1">{user?.name}</p>
                      <p className="text-xs text-muted-foreground px-2 pb-2">{user?.email}</p>
                      <hr className="my-1" />
                      <Link to="/orders" className="block px-2 py-1.5 text-sm hover:bg-accent rounded-sm">
                        My Orders
                      </Link>
                      {user?.role === 'admin' && (
                        <Link to="/admin" className="block px-2 py-1.5 text-sm hover:bg-accent rounded-sm">
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={logout}
                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm text-destructive"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Login
              </Link>
            )}

            <button className="md:hidden p-2 hover:bg-accent rounded-md transition-colors">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
