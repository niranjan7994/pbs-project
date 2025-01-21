const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  email: {
    type:String,
    required:[true, 'Email field is required']
  },
  password: {
    type:String,
    required:[true, 'Password fields is required'],
    minlength: [6, 'atleast 6 characters required']
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;