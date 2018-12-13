// Returns an object with all the bets available on the specified page

const os = require('os')
const fs = require('fs')
const rp = require('request-promise-native')
const cheerio = require('cheerio')
const moment = require('moment-timezone')

function getUniqueColHeaders(originalHeaderArray) {
  let uniqueHeaderArray = []
  let uniqueHeaderObj = {}
  let uniqueHeaderCounter = {}

  for (let header of originalHeaderArray) {
    if (!uniqueHeaderObj.hasOwnProperty(header)) {
      uniqueHeaderObj[header] = 0
      uniqueHeaderCounter[header] = 0
    }
    else uniqueHeaderObj[header] += 1
  }

  for (let header of originalHeaderArray) {
    if (uniqueHeaderObj[header] > 0) {
      uniqueHeaderArray.push(`${header}_${uniqueHeaderCounter[header]}`)
      uniqueHeaderCounter[header] += 1
    }
    else {
      uniqueHeaderArray.push(header)
    }
  }

  return uniqueHeaderArray
}

function getBetsCoupons(uri, configName, programOptions) {
  const options = {
    uri: uri,
    transform: function (body) {
      return cheerio.load(body);
    }
  };

  return new Promise( function(resolve, reject) {
    rp(options)
      .then(($) => {
        // Initialise results object
        let results = {}

        let select = $('select.js-coupon-switcher')
        let couponTitle = $(select).find('option').eq(0).text().match(new RegExp('\\s*(\\S[\\S\\s]*\\S)\\s*'))[1]

        let accordions = $('section[class=markets]').find('li')

        // Loop through each accordion and extract data
        accordions.each(function(iAccordion, accordion){
          // Each accordion represents bets on a given date. Extract the date information
          let accordionTitleText = $('h2', accordion).find('span[class=accordion__title]').text()
          let dateMoment = moment(accordionTitleText, 'dddd Do MMMM YYYY')

          // If user has specified the --day option, return only the date of interest
          if (programOptions.hasOwnProperty('day')) {
            let dateMomentTarget = moment().startOf('day').add(programOptions.day.daysAhead, 'days')
            if (!dateMomentTarget.isSame(dateMoment)) return true;
          }

          let accordionKey = dateMoment.format()
          console.log('')
          console.log(accordionTitleText)

          // Append to results object
          if (!results.hasOwnProperty(accordionKey)) results[accordionKey] = {}

          let table = $(accordion).find("table")
          let thead = $(table).find('thead')
          let tbody = $(table).find('tbody')

          // Get the column headers from thead
          let colHeadersOriginal = []
          $(thead).find('th').each( (ith, th) => {
            colHeadersOriginal.push($(th).text())
          })
          let colHeaders = getUniqueColHeaders(colHeadersOriginal)

          // Loop through all the table rows
          $(tbody).find('tr').each( (itr, tr) => {
            // Define main parameters
            let event = {
              competition: undefined,
              hours: null,
              minutes: null,
              time: undefined,
              competitors: undefined,
            }

            // Loop through each td
            $(tr).find('td').each( (itd, td) => {
              // If this is actually a header for a set of bets
              if ($(td).hasClass('group-header')) {
                let groupText = $(td).text()
                console.log(groupText)

                // Match the group header text, e.g. "Premier League - 13:30"
                let groupTextRegexMatch = groupText.match(new RegExp('\\s*([\\S\\s]+)\\s*[-–]\\s*([\\d]{2}):([\\d]{2})\\s*'))
                event.competition = groupTextRegexMatch[1]
                event.hours = groupTextRegexMatch[2]
                event.minutes = groupTextRegexMatch[3]

                // Append to results object
                if (!results[accordionKey].hasOwnProperty(event.competition)) results[accordionKey][event.competition] = {}

                // Get the time for this bet (event)
                event.time = dateMoment.clone().add(event.hours, 'hours').add(event.minutes, 'minutes')

                // Loop through the events under this group
                $(tbody).find('tr').each( (itrGroup, trGroup) => {
                  // Skip rows until we get to the rows belonging to this group
                  if (itrGroup <= itr) return true

                  // When the next group is found, quit this loop
                  if ($(trGroup).find('td').hasClass('group-header')) return false

                  $(trGroup).find('td').each( (itdGroup, tdGroup) => {
                    // This row contains bets that belong in this group

                    // Append data to results according to the type of td it is
                    if ($(tdGroup).hasClass('cell--link')) {
                      event.competitors = $(tdGroup).find('b.cell-text__line').text().match(new RegExp('\\s*([\\S\\s]*)\\s*'))[1]
                      console.log(event.competitors)

                      if (!results[accordionKey][event.competition].hasOwnProperty(event.competitors)) results[accordionKey][event.competition][event.competitors] = {}
                      results[accordionKey][event.competition][event.competitors].time = event.time.format()
                      results[accordionKey][event.competition][event.competitors].configName = configName
                      results[accordionKey][event.competition][event.competitors][colHeaders[itdGroup]] = event.competitors
                      results[accordionKey][event.competition][event.competitors].bets = {}
                    }
                    else if ($(tdGroup).hasClass('cell--price')) {
                      let betText = $(tdGroup).find('span').text()
                      let betTextRegexMatch = betText.match(new RegExp('([\\d]+)/([\\d]+)'))
                      let betOddsDecimal = 1 + parseFloat(betTextRegexMatch[1])/parseFloat(betTextRegexMatch[2])

                      results[accordionKey][event.competition][event.competitors].bets[colHeaders[itdGroup]] = betOddsDecimal
                    }
                  })
                })
              }
              else return true
            })
          })

        })

        if (os.type() == 'Linux') {
          // fs.writeFile(`../storage/external-1/BetTool/data_${couponTitle}.json`, JSON.stringify(results, null, 2), function() {});
        }
        else {
          fs.writeFile(`./temp/data_${couponTitle}.json`, JSON.stringify(results, null, 2), function() {});
        }

        resolve(results)

      })
      .catch((err) => {
        console.log(err);
        reject(err)
      });
  })
}

module.exports = {
   getBetsCoupons: getBetsCoupons
}
