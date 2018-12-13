

async function parseOptions(commander) {
  let options = {}

  console.log('\nProgram Options:')
  if (commander.day) {
    options.day = {daysAhead: isNaN(parseInt(commander.day)) ? 0 : parseInt(commander.day)}
    console.log(`Target ${options.day.daysAhead} days ahead`)
  }

  return Promise.resolve(options)
}

module.exports = {
  parseOptions: parseOptions,
}
