const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const Razorpay = require("razorpay");
require("dotenv").config();
const crypto = require("crypto");
const PORT = process.env.PORT || 8000;

const stripe = Stripe(process.env.STRIPE_SECRET);

const app = express();

app.use(express.json());
app.use(cors("*"));

app.get("/", (req, res) => {
  res.send("Payment Server initiated");
});

app.post("/order", async (req, res) => {
  try {
    var instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });
    const options = req.body;
    const order = await instance.orders.create(options);

    if (!order) {
      return res.status(500).send("Error");
    }
    res.json(order);
  } catch (err) {
    console.error(err);
  }
});

app.post("/order/validate", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;
  const sha = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET);
  sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const digest = sha.digest("hex");

  // generated_signature = hmac_sha256(order_id + "|" + razorpay_payment_id, secret);

  // if (generated_signature == razorpay_signature) {
  //   payment is successful
  // }

  if (digest !== razorpay_signature) {
    return res.status(400).json({ msg: "Transaction is not legit" });
  }

  res.json({
    msg: "success",
    order_id: razorpay_order_id,
    paymentId: razorpay_payment_id,
  });
});

app.post("/create-checkout-session", async (req, res) => {
  const { products } = req.body;
  // console.log(products);

  const lineItems = products.map((product) => ({
    price_data: {
      currency: "inr",
      product_data: {
        name: product.title,
        images: [product.image],
      },
      unit_amount: product.price * 100,
    },
    quantity: product.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    shipping_address_collection: {
      allowed_countries: ["IN"],
    },

    // ui_mode: "embeded",
    line_items: lineItems,
    mode: "payment",
    success_url: `${process.env.BASE_URL}/success`,
    cancel_url: `${process.env.BASE_URL}/cart`,
  });

  res.json({ url: session.url });
});

app.listen(PORT, () => {
  console.log(`listening to port ${PORT}`);
});
