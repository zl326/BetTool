const moment = require('moment-timezone')

async function parseOptions(commander) {
  let options = {}

  console.log('\nProgram Options Chosen:')
  if (commander.day) {
    options.day = {daysAhead: isNaN(parseInt(commander.day)) ? 0 : parseInt(commander.day)}
    console.log(`Target ${options.day.daysAhead} days ahead - ${moment().add(options.day.daysAhead, 'days').format('dddd Do MMMM')}`)
  }

  let defaultBinSize = 25
  if (commander.binSize) {
    options.binSize = {binSize: isNaN(parseInt(commander.binSize)) ? defaultBinSize : parseInt(commander.binSize)}
    console.log(`Football fetch bin size: ${options.binSize.binSize}`)
  }
  else options.binSize = {binSize: defaultBinSize}

  return Promise.resolve(options)
}

module.exports = {
  parseOptions: parseOptions,
}
