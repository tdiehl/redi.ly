
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , crypto = require('crypto')
  , bloom = require('bloom-redis');

var urlhash = "redhash";
var app = express();

var redis = require("redis"), client = redis.createClient();
bloom.connect(client);
//TODO - set the database?

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.post('/create', function(req,res){
    console.dir(req.body);
    if (req.body.url) {
        //console.log("received request to add url: " + req.body.url);
        addUrl(req.body.url, function(err,key) {
            //console.log("added: " + key);
            res.status(200).send(key);
        });
    };
});
app.get('/random', function(req,res){
    client.srandmember("random", function(err,key){
      res.redirect("/"+key);
    });
});
// rename api methods to /api/* - try /:key here (order might matter)
app.get('/:key', function(req,res){
    //console.log("request for key: " + req.params.key);
    getUrl(req.params.key,function(err,url){
        if (err) {
            //console.log(err);
            res.status(404);
        }
        if (url.indexOf("http://") == -1) {
          url = "http://"+url;
        }
        res.redirect(url);
    });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

/**
 * Generate a short URL key for the given URL
 * TODO - make sure the generated key is unique (doesn't already exist, perhaps use a bloomfiler)
 */
function addUrl(url, callback) {
    // has the url already been generated?  if so, return the hash
    client.hget("reverse", md5url(url), function(err, existing){
      console.log("is existing: " + existing);
      if (existing) {
        callback(err, existing);
      } else {
        console.log("create new key and store");
        // doesn't exist
        // generate a short url key
        var key = generateKey();
        multi = client.multi();
        // add the url to redis with the short key
        multi.hset(urlhash, key, url);
        multi.hset("reverse", md5url(url), key);
        multi.sadd("random", key);
        multi.exec(function(err,res) {
          console.log("multi answer: " + res);
          //TODO handle errors
          callback(err, key);
        });
      }
    });
}

function md5url(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

function getUrl(key, callback) {
    client.hget(urlhash, key, callback);
}

function getRandom(callback) {
    client.srandmember("random", function(err, res){
        getUrl(res,callback);
    });
}

function generateKey() {
    var key = "";
    var allowed = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for(var i=0; i<6; i++) {
        key += allowed.charAt(Math.floor(Math.random()*allowed.length));
    }
    // use bloom-redis here to check if the key exists
    return key;
}

