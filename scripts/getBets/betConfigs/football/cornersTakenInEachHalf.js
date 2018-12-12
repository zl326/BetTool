
const fs = require('fs')
const moment = require('moment-timezone')


function parseResults(resultObj) {
  console.log(resultObj)
}

function parseBets(betsList) {
  console.log(betsList)
}

// y = 0.1 + 0.9/(cosh(x/3))


module.exports = {
   uri: `https://m.skybet.com/football/coupon/10011490`,
   parseResults: parseResults,
   parseBets: parseBets,
   category: 'football',
}
