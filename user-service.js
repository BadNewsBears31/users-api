const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  userName: { type: String, unique: true },
  password: String,
  favourites: [String]
});

// Use a clear model name; Mongo will create a "users" collection by default
const User = mongoose.model("User", userSchema);

module.exports.connect = function () {
  // Optional: quick guard/log to spot undefined
  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is not set. Add it to .env locally and to Vercel Environment Variables.");
  }
  console.log("Connecting to MongoDB via MONGO_URL…");

  return mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
};

module.exports.User = User;

module.exports.registerUser = function (userData) {
  return new Promise((resolve, reject) => {
    if (!userData.userName) return reject("User name is required");
    if (userData.password !== userData.password2) return reject("Passwords do not match");

    bcrypt.hash(userData.password, 10)
      .then(hash => {
        userData.password = hash;
        const newUser = new User(userData);

        newUser.save()
          .then(() => resolve(`User ${userData.userName} successfully registered`))
          .catch(err => {
            if (err.code === 11000) reject("User Name already taken");
            else reject("There was an error creating the user: " + err);
          });
      })
      .catch(err => reject("Error hashing password: " + err));
  });
};

module.exports.checkUser = function (userData) {
  return new Promise((resolve, reject) => {
    User.findOne({ userName: userData.userName }).exec()
      .then(user => {
        if (!user) return reject("Unable to find user " + userData.userName);

        bcrypt.compare(userData.password, user.password)
          .then(match => match ? resolve(user) : reject("Incorrect password for user " + userData.userName))
          .catch(err => reject("Error comparing password: " + err));
      })
      .catch(err => reject("Database error while finding user: " + err));
  });
};

module.exports.getFavourites = function (id) {
  return new Promise((resolve, reject) => {
    User.findById(id).exec()
      .then(user => resolve(user?.favourites || []))
      .catch(() => reject(`Unable to get favourites for user with id: ${id}`));
  });
};

module.exports.addFavourite = function (id, favId) {
  return new Promise((resolve, reject) => {
    User.findById(id).exec()
      .then(user => {
        if (!user) return reject(`Unable to update favourites for user with id: ${id}`);
        if (user.favourites.length >= 50) return reject(`Unable to update favourites for user with id: ${id}`);

        User.findByIdAndUpdate(id, { $addToSet: { favourites: favId } }, { new: true }).exec()
          .then(updated => resolve(updated.favourites))
          .catch(() => reject(`Unable to update favourites for user with id: ${id}`));
      })
      .catch(() => reject(`Unable to update favourites for user with id: ${id}`));
  });
};

module.exports.removeFavourite = function (id, favId) {
  return new Promise((resolve, reject) => {
    User.findByIdAndUpdate(id, { $pull: { favourites: favId } }, { new: true }).exec()
      .then(updated => resolve(updated.favourites))
      .catch(() => reject(`Unable to update favourites for user with id: ${id}`));
  });
};

module.exports.getUserById = function (id) {
  return new Promise((resolve, reject) => {
    User.findById(id).exec()
      .then(user => user ? resolve(user) : reject("User not found with id: " + id))
      .catch(() => reject("Unable to find user with id: " + id));
  });
};

