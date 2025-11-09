import { create } from 'zustand';
import { api } from '../lib/axios';

export const useCartStore = create((set, get) => ({
  cart: null,
  isLoading: false,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/cart');
      set({ cart: data.cart, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  addItem: async (productId, variantSku, quantity = 1) => {
    const { data } = await api.post('/cart/items', { productId, variantSku, quantity });
    set({ cart: data.cart });
    return data.cart;
  },

  updateItem: async (itemId, quantity) => {
    const { data } = await api.patch(`/cart/items/${itemId}`, { quantity });
    set({ cart: data.cart });
    return data.cart;
  },

  removeItem: async itemId => {
    const { data } = await api.delete(`/cart/items/${itemId}`);
    set({ cart: data.cart });
    return data.cart;
  },

  applyCoupon: async code => {
    const { data } = await api.post('/cart/coupon', { code });
    set({ cart: data.cart });
    return data;
  },

  removeCoupon: async () => {
    const { data } = await api.delete('/cart/coupon');
    set({ cart: data.cart });
    return data.cart;
  },

  clearCart: async () => {
    await api.delete('/cart');
    set({ cart: null });
  },
}));
