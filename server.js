const express = require('express');
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const userService = require("./user-service.js");

const passport = require("passport");
const passportJWT = require("passport-jwt");
const jwt = require("jsonwebtoken");  
const JwtStrategy = passportJWT.Strategy;
const ExtractJwt = passportJWT.ExtractJwt;

const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(jwtOptions, (jwt_payload, done) => {
    userService.getUserById(jwt_payload._id)
        .then(user => user ? done(null, user) : done(null, false))
        .catch(err => done(err, false));
}));

app.use(passport.initialize());

const HTTP_PORT = process.env.PORT || 8080;

app.use(express.json());
const corsOptions = {
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
};
app.use(cors(corsOptions));
//app.use(cors());

// Register
app.post("/api/user/register", (req, res) => {
    userService.registerUser(req.body)
    .then(msg => res.json({ message: msg }))
    .catch(msg => res.status(422).json({ message: msg }));
});

// Login
app.post("/api/user/login", (req, res) => {
    userService.checkUser(req.body)
    .then(user => {
        const payload = { _id: user._id, userName: user.userName };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.json({ message: "login successful", token });
    })
    .catch(msg => res.status(422).json({ message: msg }));
});

// Protected routes
app.get("/api/user/favourites",
    passport.authenticate('jwt', { session: false }),
    (req, res) => {
        userService.getFavourites(req.user._id)
        .then(data => res.json(data))
        .catch(msg => res.status(422).json({ error: msg }));
    }
);

app.put("/api/user/favourites/:id",
    passport.authenticate('jwt', { session: false }),
    (req, res) => {
        userService.addFavourite(req.user._id, req.params.id)
        .then(data => res.json(data))
        .catch(msg => res.status(422).json({ error: msg }));
    }
);

app.delete("/api/user/favourites/:id",
    passport.authenticate('jwt', { session: false }),
    (req, res) => {
        userService.removeFavourite(req.user._id, req.params.id)
        .then(data => res.json(data))
        .catch(msg => res.status(422).json({ error: msg }));
    }
);

userService.connect()
  .then(() => {
    console.log("Database connected");
  })
  .catch(err => {
    console.log("unable to start the server: " + err);
    process.exit();
  });

module.exports = app;
