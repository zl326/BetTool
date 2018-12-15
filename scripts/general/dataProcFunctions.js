
async function getWeightedAverage(valueArray, weightingsArray) {

  // Deal with valueArray.length < weightingsArray.length
  let weightingsArrayTrimmed = weightingsArray
  if (valueArray.length < weightingsArray.length) {
    // Trim the weightingsArray to be the same size as the valueArray
    weightingsArrayTrimmed = weightingsArray.slice(0,valueArray.length)
  }

  // Normalise the weightings so they sum to one
  let weightingsArraySum = weightingsArrayTrimmed.reduce((a, b) => a + b, 0)
  let weightingsArrayFinal = weightingsArrayTrimmed.map( x => {return x/weightingsArraySum})

  // Calculate the weighted average
  let weightedAverage = 0
  valueArray.forEach( (value, valueIndex) => {

    if (typeof value == 'boolean') {
      weightedAverage += value ? weightingsArrayFinal[valueIndex] : 0
    }
    else if (typeof value == 'number') {
      weightedAverage += value*weightingsArrayFinal[valueIndex]
    }
    else console.log(`Error! Value to be weighted is neither a number nor a boolean.`)
  })

  return weightedAverage
}

module.exports = {
  getWeightedAverage: getWeightedAverage,
}
