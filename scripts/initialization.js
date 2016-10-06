/* global _, d3 */
// safari rotate bug fix
;(function (doc) {
  var addEvent = 'addEventListener'
  var type = 'gesturestart'
  var qsa = 'querySelectorAll'
  var scales = [1, 1]
  var meta = qsa in doc ? doc[qsa]('meta[name=viewport]') : []

  function fix () {
    meta.content = 'width=device-width,minimum-scale=' + scales[0] + ',maximum-scale=' + scales[1]
    doc.removeEventListener(type, fix, true)
  }

  if ((meta = meta[meta.length - 1]) && addEvent in doc) {
    fix()
    scales = [1, 1]
    doc[addEvent](type, fix, true)
  }
}(document))

// User Defined Variables
var rowHeight = 45
var _X_AXIS_HEIGHT = 30
var _X_AXIS_WIDTH = 2880 * 3 // 1 min = 2 px, 48 hours = 2880 mins = 8640 px

var stationTextHeight = 20
var stationTextPadding = {top: 10, right: 0, bottom: 0, left: 10}

var margin = {top: 0, right: 0, bottom: 30, left: 0}
var outerWidth = document.documentElement.clientWidth
var outerHeight = document.documentElement.clientHeight - 83

var _LOCATIONS = []
var _HAS_SUBSTEP_LOCATIONS = [
  'Sierra 1',
  'Sally Port'
]

var _DS = {
  POLL_RATE: 45000,
  IS_REFRESHING: false,
  TIMELINE_PORT_LABEL_SIZE: '12px',
  AHEAD_OR_BEHIND_PCT: 0.5,
  isDetailDisplayed: false,

  routes: [
    { name: 'oca',              order: ['S1', 'EX'] },
    { name: 'warehouse',        order: ['S1', 'SG', 'WH', 'SG', 'EX'] },
    { name: 'pa',               order: ['S1', 'SG', 'SP', 'PA', 'SP', 'SG', 'EX'] },
    { name: 'warehouse_and_pa', order: ['S1', 'SG', 'WH', 'SP', 'PA', 'SP', 'SG', 'EX'] },
  ],

  LOCATION_META: [
    { name: 'En Route',       abbr: 'ER', epts: [3] },
    { name: 'Sierra 1',       abbr: 'S1', epts: [5, 6, 5] },
    { name: 'Stinger Gate',   abbr: 'SG', epts: [35] },
    { name: 'Warehouse',      abbr: 'WH', epts: [60] },
    { name: 'Sally Port',     abbr: 'SP', epts: [5, 70, 15] },
    { name: 'Protected Area', abbr: 'PA', epts: [60] },
    { name: 'Exit',           abbr: 'EX', epts: [15] },
    { name: 'SP Exit',        abbr: 'SPE', epts: [20] }
  ],

  EVENTS_META: [
    { name: 's1_sas_arrived',                  to: ['sas'],                responsible: false },
    { name: 's1_poc_arrived',                  to: ['poc'],                responsible: true },
    { name: 's1_d10_cover',                    to: ['d10'],                responsible: true },
    { name: 's1_last_step_completed',          to: ['d10'],                responsible: true },
    { name: 's1_abort',                        to: ['s1'],                 responsible: true },
    { name: 's1_search_abort',                 to: ['d10', 'poc', 'sas'],  responsible: false },
    { name: 's1_search_completed',             to: ['d10'],                responsible: true },
    { name: 's1_deny_entry',                   to: ['d10', 'poc', 'sas'],  responsible: false },
    { name: 's1_seach_completed',              to: ['d10'],                responsible: false },
    { name: 's1_poc_release_vehicle',          to: ['poc'],                responsible: true },
    { name: 's1_sp_release_vehicle',           to: ['sp'],                 responsible: true },
    { name: 's1_sas_release_vehicle',          to: ['sas'],                responsible: true },
    { name: 's1_d10_release_vehicle',          to: ['d10'],                responsible: true },
    { name: 's1_d1_release_vehicle',           to: ['d1'],                 responsible: true },
    { name: 's1_vvro_release_vehicle',         to: ['vvro'],               responsible: true },
    { name: 's1_release_vehicle',              to: ['vvro'],               responsible: true },
    { name: 'si_release_confirmed',            to: ['vvro'],               responsible: false},
    { name: 'vvro_d10_release_vehicle',        to: ['d10'],                responsible: true },
    { name: 'vvro_d1_release_vehicle',         to: ['d1'],                 responsible: true },
    { name: 'vvro_poc_release_vehicle',        to: ['poc'],                responsible: true },
    { name: 'vvro_sp_release_vehicle',         to: ['sp'],                 responsible: true },
    { name: 'vvro_sas_release_vehicle',        to: ['sas'],                responsible: true },
    { name: 'vvro_s1_release_vehicle_exiting', to: ['s1'],                 responsible: true },
    { name: 'sp_vvro_release_vehicle_exiting', to: ['vvro'],               responsible: true },
    { name: 'sp_sas_release_vehicle_exiting',  to: ['sas'],                responsible: true },
    { name: 'sp_start_search',                 to: ['sas'],                responsible: true },
    { name: 'sp_search_completed',             to: ['sas'],                responsible: true },
    { name: 'sp_search_abort',                 to: ['sas', 'poc'],         responsible: false },
    { name: 'sp_deny_entry',                   to: ['sas', 'poc'],         responsible: false },
    { name: 'sp_arrived',                      to: [],                     responsible: false },
    { name: 'sp_poc_arrived',                  to: ['poc'],                responsible: true },
    { name: 'sp_poc_release_vehicle',          to: ['poc'],                responsible: true },
    { name: 'sp_release_confirmed',            to: ['poc'],                responsible: false },
    { name: 'sp_release_confirmed_exiting',    to: ['vvro'],               responsible: false },
    { name: 'sp_sas_arrived',                  to: ['sas'],                responsible: false },
    { name: 'sp_sas_cover',                    to: ['sas'],                responsible: true },
    { name: 'sp_sas_release_vehicle',          to: ['sas'],                responsible: true },
    { name: 'sp_sas_release_vehicle_exiting',  to: ['sas'],                responsible: true },
    { name: 'driver_enroute_Limerick',         to: ['sas'],                responsible: false },
    { name: 'vvro_driver_approaching_sg',      to: ['poc'],                responsible: false },
    { name: 'vvro_release_confirmed',          to: ['sp'],                 responsible: false },
    { name: 'vvro_release_confirmed_exiting',  to: [],                     responsible: false },
  ]
}

var _POSTS = [
  { fullName: 'POC',        abbr: 'poc'  },
  { fullName: 'Delta 10',   abbr: 'd10'  },
  { fullName: 'SAS',        abbr: 'sas'  },
  { fullName: 'Delta 1',    abbr: 'd1'   },
  { fullName: 'VVRO',       abbr: 'vvro' },
  { fullName: 'Sally Port', abbr: 'sp'   }
]


var _VEHICLE_TYPE_TO_IMG = {
  'non_common_carrier': 'noncommon',
  'common_carrier': 'common',
  'bulk_materials': 'bulk',
  'radioactive': 'rad',
  'emergency': 'emergency',
  'construction': 'construction',
  'passenger_imp': 'passIMP',
  'passenger_non_imp': 'passnonIMP',
  'radioactivehic': 'rad',
  'radioactive_hic': 'rad',
  'hazmat': 'rad',
  'null': 'null'
}

// var url = 'https://exelon-api.herokuapp.com/v1/'
// var url = 'https://exelon-api-production.herokuapp.com/v1/'

// Staging
var url = 'https://exelon-api-staging.herokuapp.com/v1/'
var siteId = 1
var bearerToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0eXBlIjoicm9sZSIsImlhdCI6MTQ3NTc2ODU4N30.-LkRzNzaZtkVD_C8XxS-aYKJNAhQM44X_z3h-kbWyGM'

// QA
// var url = 'https://exelon-api-qa.herokuapp.com/v1/'
// var siteId = 1
// var bearerToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0eXBlIjoicm9sZSIsImlhdCI6MTQ3MDMyMDU5Nn0.CEuKdJVBDvoDOGksBmQWMxsnc7CtV5zp59H7IrxNGhc'

// Production
// var url = 'https://vsap-ccc-02v.exelonds.com/v1/'
// var siteId = 10000
// var bearerToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0eXBlIjoicm9sZSIsImlhdCI6MTQ3Mzg2MjM2Mn0.HhyVOggZ6CoEM7D9x2tWGJtl1a6Onb9StghSONhVjHA'

var titleHeight = 83
// Calculated variables
var innerWidth = outerWidth - margin.left - margin.right
var innerHeight = outerHeight - margin.top - margin.bottom
var unixHour = 1000 * 60 * 60
var _UNIX_MINUTE = 1000 * 60
var vpStartHours = (outerWidth / 2) / (_X_AXIS_WIDTH / 48) // startHours is the time where the Viewport's (middle of screen) y axis naturally rests.  Its time in hours.
var unixStartHours = unixHour * vpStartHours
var _now = new Date(Date.now())
var _WORKFLOW_OFFSET = 3 * 60000

var nowYear = _now.getFullYear()
var nowMonth = _now.getMonth()
var nowDay = _now.getDate()
var nowHours = _now.getHours()
var nowMinutes = _now.getMinutes()

var vehicleShapeH = rowHeight - 10
var svg, stationsGroup, delieveryStaticGroup, g, deliveriesGroup, xAxisGroup, yAxisGroup, xAxisMask

var _locationHeight
var _LOCATION_STATS = []
var stationStackedCount = []
var stationStacked = []
var workflowsFakeData = []
var _deliveryIndexInfo = []
var startingX
var duration, variation, variationMinutes
var yDeliveryScale
var _currentDeliveryDelayById = {}
var _pocsAPIData
var previousYTranslation = 0
var vehiclesAPIData
var eventsReqAndRespByDeliveryAPIData
var detailStartingX
var detailDeliveryRectY

var panBounds

var customShapes = {
  lBook: function (r) {
    var points = [[0, r], [0, -r], [r, 0], [0, r]]
    return d3.svg.line()(points)
  },

  rBook: function (r) {
    var points = [[0, r], [0, -r], [-r, 0], [0, r]]
    return d3.svg.line()(points)
  },

  dBook: function (r) {
    var points = [[-r, 0], [r, 0], [0, r], [-r, 0]]
    return d3.svg.line()(points)
  }
}

var yesterdayMidDay = moment().subtract(1, 'days').startOf('day').set('hour', 12)
var tomorrowMidDay = moment().add(1, 'days').startOf('day').set('hour', 12)

var xScale = d3.time.scale.utc()
  .domain(
    [yesterdayMidDay.unix() * 1000,
     tomorrowMidDay.unix() * 1000]
  )
  .range(
    [0, _X_AXIS_WIDTH]
  )

var yDeliveryScale = d3.scale.linear()
  .domain([1, 7])
  .range([1 + rowHeight, 7 * rowHeight])

var viewportScale = d3.time.scale.utc()
  .domain(
    [yesterdayMidDay.unix() * 1000 + unixStartHours,
     tomorrowMidDay.unix() * 1000 - unixStartHours]
  )
  .range([0, -1 * _X_AXIS_WIDTH + outerWidth])

startingX = viewportScale(new Date(nowYear, nowMonth, nowDay, nowHours, nowMinutes))
detailStartingX = startingX

var xAxis = d3.svg.axis()
  .ticks(d3.time.hours, 1)
  .tickFormat(d3.time.format('%H'))
  .scale(xScale)

function setupSvgStructure () {
  svg = d3.select('body').append('svg')
    .attr('width', outerWidth)
    .attr('height', outerHeight)
    .attr('id', 'timeline')
    .call(xAxisTranslation)

  // gradients
  var svgDefs = svg.append('defs')
  var maskingGradient = svgDefs.append('linearGradient')
    .attr('id', 'maskingGradient')
    .attr('x1', '0%')
    .attr('y1', '100%')
    .attr('x2', '0%')
    .attr('y2', '0%')
  maskingGradient.append('stop')
    .attr('class', 'color-maskingGradient-top')
    .attr('offset', '0')
  maskingGradient.append('stop')
    .attr('class', 'color-maskingGradient-bottom')
    .attr('offset', '.15')
  maskingGradient.append('stop')
    .attr('class', 'color-maskingGradient-bottom')
    .attr('offset', '1')
    .attr('stop-opacity', '0')

  var maskingGradientHorizontal = svgDefs.append('linearGradient')
    .attr('id', 'maskingGradientHorizontal')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '100%')
    .attr('y2', '0%')
  maskingGradientHorizontal.append('stop')
    .attr('class', 'color-maskingGradientHorizontal-left')
    .attr('offset', '.5')
    .attr('stop-opacity', '.9')
  // maskingGradientHorizontal.append('stop')
  //     .attr('class', 'color-maskingGradientHorizontal-left')
  //     .attr('offset', '.3')
  maskingGradientHorizontal.append('stop')
    .attr('class', 'color-maskingGradientHorizontal-right')
    .attr('offset', '1')
    .attr('stop-opacity', '0')

  var aheadGradient = svgDefs.append('linearGradient')
    .attr('id', 'aheadGradient')
  aheadGradient.append('stop')
    .attr('class', 'color-ahead-left')
    .attr('offset', '0')
  aheadGradient.append('stop')
    .attr('class', 'color-ahead-right')
    .attr('offset', '1')
  var lateGradient = svgDefs.append('linearGradient')
    .attr('id', 'lateGradient')
  lateGradient.append('stop')
    .attr('class', 'color-late-left')
    .attr('offset', '0')
  lateGradient.append('stop')
    .attr('class', 'color-late-right')
    .attr('offset', '1')
  var onTimeGradient = svgDefs.append('linearGradient')
    .attr('id', 'onTimeGradient')
  onTimeGradient.append('stop')
    .attr('class', 'color-onTime-left')
    .attr('offset', '0')
  onTimeGradient.append('stop')
    .attr('class', 'color-onTime-right')
    .attr('offset', '1')
  var deniedEntryGradient = svgDefs.append('linearGradient')
    .attr('id', 'deniedEntryGradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '100%')
    .attr('y2', '0%')
  deniedEntryGradient.append('stop')
    .attr('class', 'color-deniedEntry-left')
    .attr('offset', '0')
  deniedEntryGradient.append('stop')
    .attr('class', 'color-deniedEntry-right')
    .attr('offset', '.3')
  deniedEntryGradient.append('stop')
    .attr('class', 'color-deniedEntry-right')
    .attr('offset', '.7')
  deniedEntryGradient.append('stop')
    .attr('class', 'color-deniedEntry-left')
    .attr('offset', '1')
  var fullBGGradient = svgDefs.append('radialGradient')
    .attr('id', 'fullBGGradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '100%')
    .attr('y2', '100%')
  fullBGGradient.append('stop')
    .attr('class', 'color-fullBG-left')
    .attr('offset', '0')
  fullBGGradient.append('stop')
    .attr('class', 'color-fullBG-right')
    .attr('offset', '1')

  svg.append('rect')
    .attr('x', 0)
    .attr('y', -100)
    .attr('width', outerWidth * 1.5)
    .attr('height', outerHeight * 1.5)
    .attr('fill', 'url(#fullBGGradient)')

  g = svg.append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

  deliveriesGroup = g.append('g')
    .attr('class', 'deliveries')
    .attr('transform', 'translate(' + startingX + ',' + 0 + ')')

  yAxisGroup = deliveriesGroup.append('g')
    .attr('class', 'y axis')

  xAxisMask = g.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', outerWidth)
    .attr('height', _X_AXIS_HEIGHT * 2)
    .attr('class', 'maskingGradient')
    .attr('transform', 'translate(' + 0 + ',' + (outerHeight - (_X_AXIS_HEIGHT * 2) + 1) + ')')

  xAxisGroup = g.append('g')
    .attr('class', 'x axis ')
    .attr('transform', 'translate(' + startingX + ',' + innerHeight + ')')

  yStationMask = svg.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', 120)
    .attr('height', outerHeight - _X_AXIS_HEIGHT)
    .attr('class', 'maskingGradientHorizontal')
    .attr('transform', 'translate(' + 0 + ',' + 0 + ')')

  stationsGroup = svg.append('g')
    .attr('class', 'stations')
    .attr('transform', 'translate(' + 0 + ',' + 0 + ')')

  delieveryStaticGroup = svg.append('g')
    .attr('class', 'deliveryStaticGroup')
    .attr('transform', 'translate(' + 0 + ',' + 0 + ')')
}
