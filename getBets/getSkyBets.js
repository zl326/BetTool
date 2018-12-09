// Returns an object with all the bets available on the specified page

const rp = require('request-promise-native');
const cheerio = require('cheerio');

module.exports = {
   getBets: function(uri) {

     const options = {
       uri: uri,
       transform: function (body) {
         return cheerio.load(body);
       }
     };

     rp(options)
       .then(($) => {
         // console.log($);

         let accordions = $('section[class=markets]').find('li')

         console.log(accordions)
         console.log(accordions.length)



       })
       .catch((err) => {
         console.log(err);
       });


      return
   }
}
