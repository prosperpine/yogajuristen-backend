import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcrypt-nodejs';

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/Yogajuristen';
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;
mongoose.set('useCreateIndex', true);

const User = mongoose.model('User', {
  name: {
    type: String,
    unique: true,
    required: true,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex'),
  },
});

const Review = mongoose.model('Review', {
  message: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 140,
  },
  hearts: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: () => new Date(),
  },
});

const authenticateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      accessToken: req.header('Authorization'),
    });
    if (user) {
      req.user = user;
      next();
    } else {
      res.status(403).json({ message: 'you need to log in to see this page' });
    }
  } catch (err) {
    res.status(400).json({ message: 'access denied', errors: err.errors });
  }
};

//   PORT=9000 npm start
const port = process.env.PORT || 9001;
const app = express();

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(bodyParser.json());

// Start defining your routes here
app.get('/', (req, res) => {
  res.send('Emelies page, yoga');
});

// SIGN UP
app.post('/users', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = new User({ name, email, password: bcrypt.hashSync(password) });
    const newUser = await user.save();
    res.status(201).json({
      message: 'User created.',
      userId: newUser._id,
      accessToken: newUser.accessToken,
    });
  } catch (err) {
    res
      .status(400)
      .json({ message: 'Could not create user.', errors: err.errors });
  }
});

// SECURE ENDPOINT, CHECK IF USER IS AUTHORIZED
app.get('/users/:id', authenticateUser);
app.get('/users/:id', (req, res) => {
  const loginMessage = `This is a super secret message for  ${req.user.name}`;
  res.status(201).json({ loginMessage });
});

// LOG IN
app.post('/sessions', async (req, res) => {
  try {
    const { name, password } = req.body;
    const user = await User.findOne({ name });
    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(201).json({ userId: user._id, accessToken: user.accessToken });
    } else {
      res.json({ notFound: true });
    }
  } catch (err) {
    res.status(400).json({ message: 'Could not log in', errors: err.errors });
  }
});

// SEE THE REVIEWS IN THE DATABASE
app.get('/reviews', async (req, res) => {
  try {
    const review = await Review.find().sort({ createdAt: -1 }).limit(20);
    res.json(review);
  } catch (err) {
    res.status(400).json({
      message: 'Could not load the reviews',
      errors: err.errors,
    });
  }
});

// ADD A REVIEW TO THE DATABASE
app.post('/reviews', async (req, res) => {
  const review = new Review({ message: req.body.message });
  try {
    //Sucess
    const savedReview = await review.save();
    res.status(200).json(savedReview);
  } catch (err) {
    res.status(400).json({
      message: 'Could not save review',
      errors: err.errors,
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
