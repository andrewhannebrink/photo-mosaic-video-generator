(function() {
  
  var express = require('express');
  var app = express();
  var twitter = require('twit');
/*  var OAuth = require('oauth').OAuth
    , oauth = new OAuth(
      "https://api.twitter.com/oauth/request_token",
      "https://api.twitter.com/oauth/access_token",
      "",
      "your_twitter_consumer_secret",
      "1.0",
      "http://52.26.17.253:3000/auth/twitter/callback",
      "HMAC-SHA1"
    );*/
  app.use(express.static(__dirname + '/public'));
  
  /*module.exports = {
    consumer_key: 'W896qXD84zEdQMrAkHEHY4dQ5',
    consumer_secret: 'bWnK9PkzXKkgpMTagMWqy1uMhawSVr952H9azFZ1uabGntHZSX',
    access_token: '3236346061-9Qf5lg2pIY82wOhwRLME0MWU1NPgDIe4HiFHmoU',
    access_token_secret: '4qGQnxkt7F9pjmsUHzjnw15g3uaULuAc2rPbDJp3L4Npe'
  };*/
  
  var t = new twitter('config2');
  
  app.get('/', function(req, res) {
    console.log('tiny peon hit');
    res.send('<img src="cig.png">');
  });
  
  var server = app.listen(3000, function() {
    var host = server.address().address;
    var port = server.address().port;
    console.log('tiny peon listening at http://%s:%s', host, port);
//    t.get('search/tweets', {q: 'node.js'}, function(error, tweets, response){
//      console.log(tweets);
//    });
/*    t.post('statuses/update', {status: 'All praise to @tiny_icon'}, function(error, tweet, response) {
      if (!error) {
        console.log(tweet);
      }
      else {
        console.log(error);
      }
    });*/

  });

})();
