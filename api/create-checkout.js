const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, coins, userId } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: {
            name: `${coins}コイン`,
            description: 'ポケモンオリパ コイン',
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_URL || 'https://pokemon-oripa-mwoj.vercel.app'}/success?coins=${coins}&userId=${userId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || 'https://pokemon-oripa-mwoj.vercel.app'}/cancel`,
      metadata: { userId, coins: String(coins) },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
