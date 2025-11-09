import Razorpay from 'razorpay';
import Stripe from 'stripe';
import crypto from 'crypto';
import { env } from '../config/env.js';

// Initialize Razorpay
let razorpay = null;
if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

// Initialize Stripe
let stripe = null;
if (env.USE_STRIPE && env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(env.STRIPE_SECRET_KEY);
}

export const createRazorpayOrder = async (amount, currency = 'INR', receipt) => {
  if (!razorpay) {
    throw new Error('Razorpay not configured');
  }

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt,
    });

    return order;
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw new Error('Failed to create payment order');
  }
};

export const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  if (!razorpay) {
    throw new Error('Razorpay not configured');
  }

  const text = `${orderId}|${paymentId}`;
  const generated_signature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(text)
    .digest('hex');

  return generated_signature === signature;
};

export const createStripePaymentIntent = async (amount, currency = 'inr', metadata = {}) => {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to smallest currency unit
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    throw new Error('Failed to create payment intent');
  }
};

export const verifyStripeWebhook = (payload, signature) => {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    return event;
  } catch (error) {
    console.error('Stripe webhook verification error:', error);
    throw new Error('Webhook verification failed');
  }
};

export const refundRazorpayPayment = async (paymentId, amount) => {
  if (!razorpay) {
    throw new Error('Razorpay not configured');
  }

  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(amount * 100),
    });

    return refund;
  } catch (error) {
    console.error('Razorpay refund error:', error);
    throw new Error('Failed to process refund');
  }
};

export const refundStripePayment = async (paymentIntentId, amount) => {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });

    return refund;
  } catch (error) {
    console.error('Stripe refund error:', error);
    throw new Error('Failed to process refund');
  }
};
