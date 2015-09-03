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

bot.givePics(function(err, reply) {
  if (err) return handleError(err);
});

//console.log('emojiWiki: ' + bot.emojiWiki);
//console.log(typeof bot.emojiWiki);
//console.log(bot.emojiWiki[30]);

function handleError(err) {
  console.error('response status:', err.statusCode);
  console.error('data:', err.data);
}
