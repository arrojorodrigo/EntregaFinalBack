import Stripe from 'stripe'

const stripe = new Stripe

export const createSession = (req, res) => {
    stripe.checkout.sessions.create({})
}