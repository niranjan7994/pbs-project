const express = require('express');
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const Bookmark = require('../models/bookmarkModel');
const router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
  const email = req.session.userEmail || null;
  res.render("pbs", { email: email ,error:null});
});

router.get('/signup', (req, res) => {
  res.render('signup', { message: null, errors: [] });
});

router.post('/signup', [
  check('email').isEmail().withMessage('Please enter a valid email'),
  check('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  check('confirmPassword').notEmpty().withMessage('Confirm Password field must not be empty')
], (req, res) => {
  const { email, password, confirmPassword } = req.body;

  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('signup', { 
      message: null, 
      errors: errors.array() 
    });
  }

  // Check if passwords match
  if (password !== confirmPassword) {
    return res.render('signup', { 
      message: 'Password and Confirm Password do not match', 
      errors: [] 
    });
  } else {
    // Check if the email already exists
    User.findOne({ email })
      .then(existingUser => {
        if (existingUser) {
          res.render('signup', { 
            message: 'Email already taken', 
            errors: [] 
          });
        } else {
          // Hash the password
          return bcrypt.hash(password, 10)
            .then(hashedPassword => {
              // Save the new user to the database
              const newUser = new User({ email, password: hashedPassword });
              return newUser.save();
            })
            .then(() => {
              res.redirect('/login');
            });
        }
      })
      .catch(error => {
        console.error(error);
        res.status(500).send('Internal Server Error');
      });
  }
});


router.get('/login', (req, res) => {
  res.render('login', { errors: [], message: null });
});

router.post('/login', [
  check('email').isEmail().withMessage('Please enter a valid email'),
  check('password').notEmpty().withMessage('Password cannot be empty')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('login', { 
      errors: errors.array(), 
      message: null 
    });
  }

  const { email, password } = req.body;

  User.findOne({ email })
    .then(user => {
      if (!user) {
        res.render('login', { 
          message: 'Incorrect Email Address.', 
          errors: [] 
        });
      } else {
        return bcrypt.compare(password, user.password)
          .then(isPasswordValid => {
            if (!isPasswordValid) {
              res.render('login', { 
                message: 'Incorrect password.', 
                errors: [] 
              });
            } else {
              // Set session and redirect to the dashboard
              req.session.userId = user._id;
              req.session.userEmail = user.email;
              res.render('pbs', { email: user.email,error:null });
            }
          });
      }
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Internal Server Error');
    });
});

//route for logout
router.get('/logout' ,(req,res)=>{
  req.session.destroy((err) =>{
    if (err){
      console.log(err);
      res.send('Error')
    }else{
      res.redirect('/')
    }
  });
  });

  
// Search Route to handle AJAX search
router.get('/search', (req, res) => {
  const query = req.query.query;

  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  if (!query) {
    return res.json([]); // If no query is provided, return an empty array
  }

  // Query the bookmarks collection for matching title or URL and filter by userId
  Bookmark.find({
    userId: req.session.userId, // Only fetch bookmarks for the logged-in user
    $or: [
      { title: { $regex: query, $options: 'i' } }, // Case-insensitive search for title
      { url: { $regex: query, $options: 'i' } }    // Case-insensitive search for URL
    ]
  })
  .then(bookmarks => {
    res.json(bookmarks); // Send the found bookmarks as a JSON response
  })
  .catch(err => {
    console.error('Error searching bookmarks:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });
});

// GET route for adding a bookmark
  router.get('/add', function (req, res) {
    res.render('add'); // Render the Add Bookmark form
  });

// POST route for adding a bookmark
router.post('/add', (req, res) => {
  const { title, url } = req.body;
  const userId = req.session.userId;

  if (!userId) return res.redirect('/login');

  Bookmark.countDocuments({ userId }).then(count => {
    if (count >= 5) {
      res.render('pbs', { 
        email: req.session.userEmail, 
        error: 'You can only add up to 5 bookmarks.'
      });
    } else {
      const newBookmark = new Bookmark({ userId, title, url });
      newBookmark.save()
        .then(() => res.redirect('/bookmarks'))
        .catch(err => {
          console.error(err);
          res.status(500).send('Internal Server Error');
        });
    }
  });
});


// Route to render edit form
router.get('/edit/:id', (req, res) => {
  const bookmarkId = req.params.id;

  Bookmark.findById(bookmarkId)
      .then(bookmark => {
          if (!bookmark) {
              return res.status(404).send('Bookmark not found');
          }

          res.render('edit', { bookmark });
      })
      .catch(err => {
          console.error(err);
          res.status(500).send('Internal Server Error');
      });
});

// Route to handle bookmark updates
router.post('/edit/:id', (req, res) => {
  const bookmarkId = req.params.id;
  const { title, url } = req.body;

  Bookmark.findByIdAndUpdate(bookmarkId, { title, url }, { new: true })
      .then(() => {
          res.redirect('/bookmarks'); // Redirect to the main page or bookmarks listing
      })
      .catch(err => {
          console.error(err);
          res.status(500).send('Internal Server Error');
      });
});


router.post('/delete-bookmark', (req, res) => {
  const { id } = req.body;

  Bookmark.findByIdAndDelete(id)
    .then(() => res.redirect('/bookmarks'))
    .catch(err => {
      console.error(err);
      res.status(500).send('Internal Server Error');
    });
});

router.get('/bookmarks', async (req, res) => {
  const { page = 1, limit = 2 } = req.query; // Default to page 1 and limit 2

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { addedAt: -1 }, // Sort by date added, newest first
  };

  try {
    const result = await Bookmark.paginate({ userId: req.session.userId }, options);
    res.render('bookmarks', {
      bookmarks: result.docs,
      pagination: {
        page: result.page,
        totalPages: result.totalPages,
        totalDocs: result.totalDocs,
        hasPrevPage: result.hasPrevPage,
        hasNextPage: result.hasNextPage,
        prevPage: result.prevPage,
        nextPage: result.nextPage,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
