// setting up dependencies 
const express = require('express')
const cheerio = require('cheerio')
const axios = require('axios')
const mongoose = require('mongoose')
const logger = require('morgan')
const port = process.env.PORT || 8080;

const db = require('./models');

const app = express()

// setting up middleware 
app.use(logger('dev'));
app.use(express.urlencoded({
  extended: true
}))
app.use(express.json());

// Make public a static folder
app.use(express.static("public"));

// // database connection options
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadLines";

// connecting to database

mongoose.connect(
    MONGODB_URI, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      useFindAndModify: false,
      useCreateIndex: true,
    }).then(() => console.log('DB Connected!'))
  .catch(err => {
    console.log(`DB Connection Error: ${err.message}`)
  })

app.get('/scrape', function (req, res) {

  axios.get("https://www.smashingmagazine.com/articles/").then(function (response) {

    const $ = cheerio.load(response.data);


    $('article.article--post').each(function (i, elem) {

      const result = {}

      result.title = $(this).find("h1").text();
      result.link = `https://www.smashingmagazine.com${$(this)
                        .find('h1').find('a').attr('href')}`;
      result.summary = $(this).find('.article--post__teaser').text().split("\n")[1]
      result.dateWritten = $(this).find('time').attr('datetime');

      if (!result.title || !result.link || !result.summary || !result.dateWritten) {
        console.log(result.link, result.summary)

        console.log('error')
      }

        console.log(result.summary, result.link)



        db.Article.create(result)

          .then(function () {
            // res.json(dbArticle)
            console.log(result)
          }).catch(function (err) {
            // If an error occurred, send it to the client
            console.log(err);

          })
      })

    })
    db.Article.find({}).sort({
      dateWritten: -1
  }).then(function (dbArticle) {
    res.json(dbArticle)
    console.log(dbArticle)
  }).catch(function (err) {
    // If an error occurred, send it to the client
    console.log(err);
  })

})




app.get("/api/articles", function (req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .sort({
      updatedAt: -1
    })
    .populate('Comment')
    .then(function (dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.get("/api/saved", function (req, res) {
  // Grab every document in the Articles collection
  db.Article.find({
      "saved": true
    })
    .sort({
      updatedAt: -1
    })
    .populate('comments')
    .then(function (dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.post("/api/articles/:id", function (req, res) {
  db.Article.findOne({
      _id: req.params.id
    })
    .then(function (dbArticle) {
      return db.Article.findOneAndUpdate({
        _id: dbArticle._id
      }, {
        saved: true
      }, {
        new: true
      });
    })
    .catch(function (err) {
      res.json(err);
    })

})

app.post("/api/saved/:id", function (req, res) {
  db.Article.findOne({
      _id: req.body.id
    })
    .then(function (dbArticle) {
      return db.Article.findOneAndUpdate({
        _id: dbArticle._id
      }, {
        saved: false
      }, {
        new: true
      });
    })
    .catch(function (err) {
      res.json(err);
    })

})

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/comment/:id", function (req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({
      _id: req.params.id
    }).populate('comments')
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.post('/comment/:id', function (req, res) {
  // Create a new note and pass the req.body to the entry
  db.Comment.create(req.body)
    .then(function (dbComment) {
      // If a Comment was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new comment
      // { new: true } tells the query that we want it to return the updated value -- it returns the original by default
      return db.Article.findOneAndUpdate({
        _id: req.body.id
      }, {
        $push: {
          comments:
            dbComment._id
        }
      }, {
        new: true
      });
    })
    .then(function (dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.post("/api/articles/:id", function (req, res) {
  db.Comment.findOne({
      _id: req.body.id
    })
    .then(function (dbComment) {
      return db.Comment.deleteOne(dbComment)
    })
    .catch(function (err) {
      res.json(err);
    })

})

app.listen(port, () => console.log(`Listening on port ${port}`))