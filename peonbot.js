//
//  Bot
//  class for performing various twitter actions
//
var fs = require('fs');
var http = require('http');
var utf8 = require('utf8');
var Twit = require('./node_modules/twit/lib/twitter');
var exec = require('child_process').exec;
var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');


var Bot = module.exports = function(config) { 
  this.twit = new Twit(config);
  this.emojiWiki = fs.readFileSync('./public/emojiWiki.txt', 'utf8');
  this.emojiWiki = modifyEmojiWiki(this.emojiWiki)
  this.replies = JSON.parse(fs.readFileSync('./replies.json', 'utf8'));
  this.spamLock = false;
  this.givePicsLock = false;
  this.dburl = 'mongodb://localhost:27017/peondb';
  console.log(this.replies);
};

// make childproc belong to bot to avoid memory leak
Bot.prototype.childProc;
//locks childProc for downloading photos and remojiing them so i can always use downloaded.png as a file name

var modifyEmojiWiki = function(emojiText) {
  var regex = /\./gi, result, indices = [];
  while ( (result = regex.exec(emojiText)) ) {
    indices.push(result.index);
  };
  var sentences = [];
  for (var i = 0; i < indices.length - 1; i++) {
    var distance = indices[i+1] - indices[i];
    if (distance > 100) {
      var sentence = emojiText.substring(indices[i] + 1, indices[i] + 100)
    } else {
      var sentence = emojiText.substring(indices[i] + 1, indices[i] + distance);
    }
    sentences.push(sentence);
  }
  /*console.log(sentences);
  for (var i = 0; i < sentences.length; i++) {
    console.log(sentences[i].length);
  };*/
  return sentences;
};

Bot.prototype.validateTweet = function(tweet) {
  if (tweet.entities.hasOwnProperty('media') && tweet.user.screen_name !== 'tiny_peon') {
    if (tweet.entities.media.length === 1 && tweet.entities.media[0].type === 'photo') {
      return true;
    } else {
      return false;
    }
  } else{
    return false;
    console.log('tweet validated');
  }
};

Bot.prototype.insertDocuments = function(db, tweet, callback) {
  // Get the documents collection 
  var collection = db.collection('unresponded');
  // Insert some documents 
  var doc = {tweet: tweet, responded: false};
  collection.insert([doc], function(err, result) {
    assert.equal(err, null);
    assert.equal(1, result.ops.length);
    callback(result);
  });
}

//checks if tweet has since been deleted
Bot.prototype.tweetExists = function(tweet, callback) {
  this.twit.get('statuses/show/:id', { id: tweet.id_str}, function(err, data, response) {
    if (err) {
      console.log(err); 
      console.log('ERR: hoping its tweet doesnt exist for now :) ' + tweet.id_str);
      callback(false);
    } else {
      callback(true); 
    }
  });
};

Bot.prototype.findDocuments = function(db, callback) {
  var thisbot = this;
  var collection = db.collection('unresponded');
  collection.find({responded: false}).toArray(function(err, docs) {
    assert.equal(err, null);
    if (typeof docs === 'undefined') {
      console.log('ERR: list of docs with responded:false is undefined');
      callback();
    
    } else if (docs.length === 0) {
      console.log('no unresponded tweets');
      callback();
    } else {
      console.log('unresponded tweets: ' + docs.length);
      var tweet = docs[0].tweet;
      console.log('picked doc');
      thisbot.tweetExists(tweet, function(exists) {
        if (exists === false) {
          console.log('tweet has since been deleted');
          collection.update({tweet: tweet}, { $set: {responded: "deleted"} }, function(err, result) {
            assert.equal(err, null);
            console.log('updated responded field to deleted in mongo');
            callback();
          });
        } else {
          console.log('tweet still exists / was not deleted');
          var text = thisbot.makeText(tweet);
          var tempFile = 'latePic';
          var opName = 'lateop';
          thisbot.DlPic(tweet.entities.media[0].media_url, tempFile, thisbot.convertRemojiTweet(tweet, tempFile, text, opName));
          collection.update({tweet: tweet}, { $set: {responded: true} }, function(err, result) {
            assert.equal(err, null);
            console.log('updated responded field to true in mongo');
            callback();
          });
        }
      });
    }
  });
};
  

Bot.prototype.emptyDB = function(callback) {
  var thisbot = this;
  if (thisbot.givePicsLock === false) {
    console.log('GivePicsLock taken by emptyDB()');
    thisbot.givePicsLock = true;
    MongoClient.connect(thisbot.dburl, function(err, db) {
      assert.equal(err, null);
      thisbot.findDocuments(db, function() {
        db.close();
        setTimeout(function() {
          console.log('givePicsLock now FALSE.. released from emptyDB()');
          thisbot.givePicsLock = false;
          setTimeout(function() {
            thisbot.emptyDB()
            thisbot.spamLock = false;
          }, 12000);
        }, 40000);
      }); 
    });
  } else {
    console.log('emptyDB() blocked by givePicsLock');
    setTimeout(function() {
      thisbot.emptyDB();
    }, 14000);
  }
};

Bot.prototype.givePics = function(collect, callback) {
  var thisbot = this;
  console.log('collect: ' + collect);
  var stream = this.twit.stream('statuses/filter', { track: '@tiny_peon' });
  stream.on('tweet', function(tweet) {
    var validated = thisbot.validateTweet(tweet)
    if (thisbot.givePicsLock === true || collect === true) {
      if (validated === true) {
        MongoClient.connect(thisbot.dburl, function(err, db) {
          assert.equal(null, err);
          console.log('connected to mongo');
          thisbot.insertDocuments(db, tweet, function() {
            console.log('inserted blocked tweet into mongo');
            db.close();
          });
        });
        //var status = '@' + tweet.user.screen_name + ' ' + randIndex(thisbot.replies.kaomoji) + ' ' + randIndex(thisbot.replies.err);
        console.log('givePics BLOCKED HERE by givePicsLock');
        //thisbot.twit.post('statuses/update', { status: status }, function() {
        //  return;
        //});
      }
    } else {
      if (validated === true) {
        console.log('GivePicsLock taken by givePics()');
        thisbot.givePicsLock = true;
        console.log('givePicksLock now true');
        console.log('DOWNLOADING pic to GIVE BACK');
        var tempFile = 'givePic';
        var opName = 'giveop';
        var text = thisbot.makeText(tweet);
        thisbot.DlPic(tweet.entities.media[0].media_url, tempFile, thisbot.convertRemojiTweet(tweet, tempFile, text, opName));
        setTimeout(function() {
          console.log('givePicsLock now FALSE... released from givePics()');
          thisbot.givePicsLock = false;
          setTimeout(function() {
            thisbot.spamLock = false;
          }, 60000);
        }, 12000);
      }
    }
  });
};

Bot.prototype.makeSen = function() {
  var text = randIndex(this.replies.kaomoji) + ' ' + randIndex(this.replies.sen.nv) + randIndex(this.replies.sen.art) + randIndex(this.replies.sen.adj) + randIndex(this.replies.sen.n) + '\n[' + randIndex(this.replies.tags) + ']\n[by @tiny_icon]';
  return text;
};

Bot.prototype.makeText = function(tweet) {
  var text = '';
  var sen = Math.random();
  if (sen > 0.5) {
    text = '@' + tweet.user.screen_name + ' '; 
    text = text + this.makeSen();
  }
  else {
    var picker = Math.random();
    if (picker < 0.3) {
      text = '@' + tweet.user.screen_name + ' ' + randIndex(this.replies.kaomoji); 
      var ranbin = [randIndex([0, 1]), randIndex([0, 1])];
      if (ranbin[0] === 0) {
        if (ranbin[1] === 1) {
          text = text + ' ' + randIndex(this.replies.tellToGive) +'\n'+ randIndex(this.replies.kaomoji)+'\n[by @tiny_icon]';
        } else {
          text = text + ' ' + randIndex(this.replies.tellToGive) +'\n'+ randIndex(this.replies.links);
        }
      } else {
        text = text + ' ' + randIndex(this.replies.tellToGive) +'\n\n[by @tiny_icon] ' + randIndex(this.replies.tags);
      }
    } else {
       var wtfPicker = Math.random();
       if (wtfPicker < 0.4) {
         text = '@' + tweet.user.screen_name + ' '+ randIndex(this.replies.wtf) + ' ' + randIndex(this.replies.kaomoji) + ' ' + randIndex(this.replies.mes) + randIndex(this.replies.hitters) + '\n' + randIndex(this.replies.kaomoji);
      } else {
         text = '@' + tweet.user.screen_name + ' '+ randIndex(this.replies.kaomoji) + ' ' + randIndex(this.replies.kaomoji) + ' ' + randIndex(this.replies.mes) + randIndex(this.replies.hitters) + '\n' + randIndex(this.replies.kaomoji);
      }
      var tagP = Math.random();
      if (tagP < 0.35) { 
        text = text + ' ' + randIndex(this.replies.tags) + '\n[by @tiny_icon]';
      } else {
        text = text + ' ' + randIndex(this.replies.links);
      }
    }
  }
  return text;
};

Bot.prototype.emojiSpam = function(callback) {
  var thisbot = this;
  var stream = this.twit.stream('statuses/filter', { track: 'emoji' });
  stream.on('tweet', function (tweet) {
    if (thisbot.spamLock === false && thisbot.givePicsLock === false) {
      if (tweet.entities.hasOwnProperty('media')) {
        /*console.log(tweet.user.screen_name);
        console.log(tweet.text);
        console.log(tweet.entities.media);*/
        if (tweet.entities.media.length === 1 && tweet.entities.media[0].type === 'photo') {
         // if (tweet.user.followers_count >= 420 && tweet.user.followers_count < 5000) {
            console.log('spam lock now true');
            thisbot.spamLock = true;
            console.log('downloading pic');
            var tempFile = 'downloaded';
            var opName = 'getridofthisfunc'
            var text = '@' + tweet.user.screen_name + ' ' + randIndex(thisbot.replies.tellToGive) + ' by @tiny_icon';
            thisbot.DlPic(tweet.entities.media[0].media_url, tempFile, thisbot.convertRemojiTweet(tweet, tempFile, text, opName));
            //spamLock helps this bot from spamming too often
            setTimeout(function() {
              thisbot.spamLock = false;
              console.log('givePicsLock now FALSE...released from <get rid of this fnc>');
              thisbot.givePicsLock = false;
              console.log('spamLock now false');
            }, 120000);
        }
        var debugProgStr = ((Math.random()<.5) ? '' : '=');
        console.log('======================================' + debugProgStr);
      }
    }
  });
};

Bot.prototype.DlPic = function(url, tempFile, callback) {
  var thisbot = this;
  var file = fs.createWriteStream('./public/'+tempFile+'.jpg');
  var request = http.get(url, function(response) {
    response.pipe(file);
  });
};

//function for replying to tweets with a remojified twitpic
Bot.prototype.convertRemojiTweet = function(tweet, tempFile, text, opName) {
  var thisbot = this;
  setTimeout(function() {
    thisbot.childProc = exec('convert public/'+tempFile+'.jpg public/'+tempFile+'.png', function(error, stdout, stderr) {
      /*console.log('stdout: ' + stdout);
      console.log('stderr: ' + stderr);*/
      thisbot.remoji('emoji/', 1, 10, 'public/'+tempFile+'.png', text, tweet, opName);
    });
  }, 5000);
};

Bot.prototype.picpost = function(text, pic, tweet2Reply2, callback) {
  console.log(pic);
  var png = fs.readFileSync(pic, { encoding: 'base64'});
  var thisbot = this;
  thisbot.twit.post('media/upload', { media: png}, function (err, data, response) {
    var mediaIdStr = data.media_id_string;
    var paramas = { status: text, media_ids: [mediaIdStr] };
    if (tweet2Reply2 !== null) {
      paramas.in_reply_to_status_id = tweet2Reply2.id_str;
      console.log('in_reply_to_status_id: ' + paramas.in_reply_to_status_id);
    } else {
       console.log('not in replay to a tweet');
    }
    thisbot.twit.post('statuses/update', paramas, function(err, data, response) {
      if (err) {
        console.log(err);
      }
      console.log('data: ' + data);
    });
  });
};

Bot.prototype.remoji = function (dir, scale, reso, inputPath, text, tweet2Reply2, opName) {
  var thisbot = this;
  var opPath = 'public/' + opName + '.png';
  var cmd = 'python remoji.py -s ' + inputPath + ' ' + dir + ' ' + opPath + ' ' + scale + ' ' + reso;
  console.log(cmd);
  var opExists = false;
  this.childProc = exec(cmd, function(error, stdout, stderr) {
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    if (error !== null) {
      console.log('exec error: ' + error);
    }
    thisbot.picpost(text, './' + opPath, tweet2Reply2, function(err, reply) {
      if (err) return handleError(err);
    });
  });
};

Bot.prototype.randRemoji = function () {
  if (this.givePicsLock === false) {
    var possDirs = ['emoji/', 'win/'];
    var bigImgDir = randIndex(possDirs);
    var lilImgDir = randIndex(possDirs);
    var scale = 15;
    var reso = Math.floor(Math.random() * (40 - 7) + 7); 
    var thisbot = this;
    var jsdir = './' + bigImgDir;
    fs.readdir(jsdir, function (err, files) {
      if (err) {
        throw err;
        return
      }
      else {
        var file = bigImgDir + randIndex(files);
        //var text = wordScramble(randIndex(thisbot.emojiWiki)) + ' @tiny_icon';
        var text = '(✤❛⃘ͫ Ʉ̮ ❛⃘ͫ)';
        var tweet2Reply2 = null;
        thisbot.remoji(lilImgDir, scale, reso, file, text, tweet2Reply2);
      }
    });
  }
};

var wordScramble = function(emojiText) {
  var emojiText = emojiText.replace(/\sthe\s/g, randIndex([' his ', ' her ']));
  emojiText = emojiText.replace(/\sThe\s/g, randIndex([' His ', ' Her ']));
  emojiText = emojiText.replace(/\sand\s/g, ' but not ');
  return emojiText;
};

function randIndex (arr) {
  var index = Math.floor(arr.length*Math.random());
  return arr[index];
};

//
//  post a tweet
//
//Bot.prototype.tweet = function (status, callback) {
//  if(typeof status !== 'string') {
//    return callback(new Error('tweet must be of type String'));
//  } else if(status.length > 140) {
//    return callback(new Error('tweet is too long: ' + status.length));
//  }
//  this.twit.post('statuses/update', { status: status }, callback);
//};


//Bot.prototype.search = function(term, date, callback) {
//  if(typeof term !== 'string') {
//    return callback(new Error('search term must be of type String'));
//  }
//  this.twit.get('search/tweets', {q: term + ' since:' + date, count: 100 }, function(err, data, response) {
//    //randomTweet = randIndex(data)
//    console.log(data);
//    /*for (var i = 0; i < data.statuses.length; i++) {
//      console.log(data.statuses[i]);
//    }*/
//  });
//};
