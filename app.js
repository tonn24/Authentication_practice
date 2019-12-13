//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require('mongoose-findorcreate');
const FacebookStrategy = require('passport-facebook').Strategy;


const app = express();

app.use(express.static("public"));
app.set("view-engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: "mySecret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://www.example.com/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate({facebookId: profile.id}, function(err, user) {
      if (err) { return done(err); }
      done(null, user);
    });
  }
));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true);


const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    facebookId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

app.get("/", (req, res) => {
    res.render("home.ejs");
});

app.get("/auth/google", 
    passport.authenticate('google', { scope: ['profile'] })
);

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets page.
    res.redirect("/secrets");
  });

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/login' }));
                                    
  app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: 'read_stream' })
);

app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['read_stream', 'publish_actions'] })
);

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
});

app.get("/secrets", (req, res) => {
    if(req.isAuthenticated()){
        res.render("secrets.ejs");
    } else {
        res.redirect("/home");
    }
});

app.post("/register", (req, res) => {
    User.register({username: req.body.username}, req.body.password, (err, user) => {
        if(err){
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login", (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, (err) => {
        if(err){
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            });
        }
    })
});

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
});

app.listen(3000, () => {
    console.log("Server has started on port 3000");
})