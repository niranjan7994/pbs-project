const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2')// imported the mongoose-paginate

const bookmarkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  addedAt: { type: Date, default: Date.now }
});

bookmarkSchema.plugin(mongoosePaginate);// use the plugin
const Bookmark = mongoose.model('Bookmark', bookmarkSchema);

module.exports = Bookmark;
