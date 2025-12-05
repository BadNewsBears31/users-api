const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

let mongoDBConnectionString = process.env.MONGO_URL;

let Schema = mongoose.Schema;

let userSchema = new Schema({
    userName: {
        type: String,
        unique: true
    },
    password: String,
    favourites: [String]
});

const User = mongoose.model("User", userSchema);

module.exports.connect = function () {
    return mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
};
  
  module.exports.User = User;

module.exports.registerUser = function (userData) {
    return new Promise((resolve, reject) => {
      if (!userData.userName) {
        return reject("User name is required");
      }
  
      if (userData.password !== userData.password2) {
        return reject("Passwords do not match");
      }
  
      bcrypt.hash(userData.password, 10)
        .then(hash => {
          userData.password = hash;
          let newUser = new User(userData);
  
          newUser.save()
            .then(() => {
              resolve(`User ${userData.userName} successfully registered`);
            })
            .catch(err => {
              if (err.code === 11000) {
                reject("User Name already taken");
              } else {
                reject("There was an error creating the user: " + err);
              }
            });
        })
        .catch(err => reject("Error hashing password: " + err));
    });
};
  

module.exports.checkUser = function (userData) {
    return new Promise(function (resolve, reject) {

        User.findOne({ userName: userData.userName })
            .exec()
            .then(user => {
                if (!user) {
                    // Handle case where no user is found
                    reject("Unable to find user " + userData.userName);
                } else {
                    // Compare hashed password
                    bcrypt.compare(userData.password, user.password)
                        .then(res => {
                            if (res === true) {
                                resolve(user);
                            } else {
                                reject("Incorrect password for user " + userData.userName);
                            }
                        })
                        .catch(err => reject("Error comparing password: " + err));
                }
            })
            .catch(err => {
                reject("Database error while finding user: " + err);
            });
    });
};


module.exports.getFavourites = function (id) {
    return new Promise(function (resolve, reject) {

        User.findById(id)
            .exec()
            .then(user => {
                resolve(user.favourites)
            }).catch(err => {
                reject(`Unable to get favourites for user with id: ${id}`);
            });
    });
}

module.exports.addFavourite = function (id, favId) {

    return new Promise(function (resolve, reject) {

        User.findById(id).exec().then(user => {
            if (user.favourites.length < 50) {
                User.findByIdAndUpdate(id,
                    { $addToSet: { favourites: favId } },
                    { new: true }
                ).exec()
                    .then(user => { resolve(user.favourites); })
                    .catch(err => { reject(`Unable to update favourites for user with id: ${id}`); })
            } else {
                reject(`Unable to update favourites for user with id: ${id}`);
            }

        })

    });


}

module.exports.removeFavourite = function (id, favId) {
    return new Promise(function (resolve, reject) {
        User.findByIdAndUpdate(id,
            { $pull: { favourites: favId } },
            { new: true }
        ).exec()
            .then(user => {
                resolve(user.favourites);
            })
            .catch(err => {
                reject(`Unable to update favourites for user with id: ${id}`);
            })
    });
}

module.exports.getUserById = function (id) {
    return new Promise((resolve, reject) => {
        User.findById(id).exec()
            .then(user => {
                if (user) {
                    resolve(user);
                } else {
                    reject("User not found with id: " + id);
                }
            })
            .catch(err => {
                reject("Unable to find user with id: " + id);
            });
    });
};
