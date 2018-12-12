
const fs = require('fs')
const moment = require('moment-timezone')


parseResult = function(resultObj) {
  console.log(resultObj)
}

// y = 0.1 + 0.9/(cosh(x/3))


module.exports = {
   uri: `https://m.skybet.com/football/coupon/10011480`,
   parseResult: parseResult,
   category: 'football',
}
