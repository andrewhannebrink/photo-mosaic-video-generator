var Bot = require('./peonbot')
  , config1 = require('./config1');

var bot = new Bot(config1);

console.log('peon: Running.');

//get date string for today's date (e.g. '2011-01-01')
function datestring () {
  var d = new Date(Date.now() - 5*60*60*1000);  //est timezone
  return d.getUTCFullYear()   + '-'
     +  (d.getUTCMonth() + 1) + '-'
     +   d.getDate();
};

/*setInterval(function() {
  bot.randRemoji();
}, 1800000);*/

/*bot.emojiSpam(function(err, reply) {
  if (err) return handleError(err);
});*/

//bot.randRemoji();

//bot.emptyDB();

var collect = false;
bot.givePics(collect, function(err, reply) {
  if (err) return handleError(err);
});

/*setInterval(function() {
  console.log('running emptyDB()');
  bot.emptyDB();
}, 45000);*/

//console.log('emojiWiki: ' + bot.emojiWiki);
//console.log(typeof bot.emojiWiki);
//console.log(bot.emojiWiki[30]);

function handleError(err) {
  console.error('response status:', err.statusCode);
  console.error('data:', err.data);
}
/*  bot.tweet('praise be to @tiny_icon', function (err, reply) {
    if (err) return handleError(err);
    console.log('\nTweet: ' + (reply ? reply.text : reply));
  });*/

/*  var date = datestring();
  bot.search('emoji', date, function (err, reply) {
    if (err) return handleError(err);
  });*/ 
