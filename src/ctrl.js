import {MetricsPanelCtrl} from 'app/plugins/sdk';
import _ from 'lodash';
import $ from 'jquery';
import kbn from 'app/core/utils/kbn';
import config from 'app/core/config';
import TimeSeries from 'app/core/time_series2';
//import * as d3 from '../bower_components/d3/d3.js';
import * as d3 from './external/d3.v3.min';
import './css/panel.css!';
import './external/d3bullet';

const panelDefaults = {
  fontSizes: [4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56,58,60,62,64,66,68,70],
  fontTypes: [
    'Arial', 'Avant Garde', 'Bookman',
    'Consolas', 'Courier', 'Courier New',
    'Garamond', 'Helvetica', 'Open Sans',
    'Palatino', 'Times', 'Times New Roman',
    'Verdana'
  ],
  unitFormats: kbn.getUnitFormats(),
  operatorNameOptions: ['min','max','avg', 'current', 'total', 'name'],
  valueMaps: [
    { value: 'null', op: '=', text: 'N/A' }
  ],
  mappingTypes: [
    {name: 'value to text', value: 1},
    {name: 'range to text', value: 2},
  ],
  rangeMaps: [
    { from: 'null', to: 'null', text: 'N/A' }
  ],
  tickMaps: [],
  mappingType: 1,
  thresholds: '',
  colors: ["rgba(245, 54, 54, 0.9)", "rgba(237, 129, 40, 0.89)", "rgba(50, 172, 45, 0.97)"],
  decimals: 2, // decimal precision
  format: 'none', // unit format
  operatorName: 'avg', // operator applied to time series
  bullet: {
    minValue: 0,
    maxValue: 100,
    tickSpaceMinVal: 1,
    tickSpaceMajVal: 10,
    bulletUnits: '', // no units by default, this will be selected by user
    bulletRadius: 0, // 0 for auto-scale
    pivotRadius: 0.1,
    padding: 0.05,
    edgeWidth: 0.05,
    tickEdgeGap: 0.05,
    tickLengthMaj: 0.15,
    tickLengthMin: 0.05,
    needleTickGap: 0.05,
    needleLengthNeg: 0.2,
    ticknessBulletBasis: 200,
    needleWidth: 5,
    tickWidthMaj: 5,
    tickWidthMin: 1,
    titleFontSize: 22,
    subtitleFontSize: 18,
    zeroTickAngle: 60,
    maxTickAngle: 300,
    zeroNeedleAngle: 40,
    maxNeedleAngle: 320,
    outerEdgeCol:  '#0099CC',
    innerCol:      '#fff',
    pivotCol:      '#999',
    needleCol:     '#0099CC',
    unitsLabelCol: '#000',
    tickLabelCol:  '#000',
    tickColMaj:    '#0099CC',
    tickColMin:    '#000',
    tickFont: 'Open Sans',
    titleFont: 'Open Sans',
    subtitleFont: 'Open Sans',
    titleCol: '#fff',
    subtitleCol: '#999',
    rangeCol: '#0099CC',
    measureCol:'#7eb26d',
    markerCol: '#000',
    tickCol: '#FFF',
    rangesColor: [],
    measuresColor : [],
    valueYOffset: 0,
    showThresholdOnBullet: false,
    showThresholdColorOnValue: false,
    showLowerThresholdRange: false,
    showMiddleThresholdRange: true,
    showUpperThresholdRange: true,
    animateNeedleValueTransition: true,
    animateNeedleValueTransitionSpeed: 100
  },
};

class D3BulletPanelCtrl extends MetricsPanelCtrl {

  constructor($scope, $injector, alertSrv) {
    super($scope, $injector);
    // merge existing settings with our defaults
    _.defaults(this.panel, panelDefaults);
    this.panel.bulletDivId = 'd3bullet_svg_' + this.panel.id;
    this.containerDivId = 'container_'+this.panel.bulletDivId;
    this.scoperef = $scope;
    this.alertSrvRef = alertSrv;
    this.initialized = false;
    this.panelContainer = null;
    this.panel.svgContainer = null;
    this.svg = null;
    this.panelWidth = null;
    this.panelHeight = null;
    this.bulletObject = null;
    this.bulletsData =[
      {"title":"Revenue","subtitle":"US$, in thousands","ranges":[150,225,300],"measures":[220,270],"markers":[250]},
      {"title":"Profit","subtitle":"%","ranges":[20,25,30],"measures":[21,23],"markers":[26]},
      {"title":"Order Size","subtitle":"US$, average","ranges":[350,500,600],"measures":[100,320],"markers":[550]},
      {"title":"New Customers","subtitle":"count","ranges":[1400,2000,2500],"measures":[1000,1650],"markers":[2100]},
      {"title":"Satisfaction","subtitle":"out of 5","ranges":[3.5,4.25,5],"measures":[3.2,4.7],"markers":[4.4]}
    ];
    this.data = {
      value: 0,
      valueFormatted: 0,
      valueRounded: 0
    };
    this.series = [];
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    //this.events.on('render', this.onRender.bind(this));
    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
  }

  onInitEditMode() {
    // determine the path to this plugin
    var panels = grafanaBootData.settings.panels;
    var thisPanel = panels[this.pluginId];
    var thisPanelPath = thisPanel.baseUrl + '/';
    //add the relative path to the partial
    var optionsPath = thisPanelPath + 'partials/editor.options.html';
    this.addEditorTab('Options', optionsPath, 2);
    // var radialMetricsPath = thisPanelPath + 'partials/editor.radialmetrics.html';
    // this.addEditorTab('Radial Metrics', radialMetricsPath, 3);
    // var thresholdingPath = thisPanelPath + 'partials/editor.thresholding.html';
    // this.addEditorTab('Thresholding', thresholdingPath, 4);
    // var mappingsPath = thisPanelPath + 'partials/editor.mappings.html';
    // this.addEditorTab('Value Mappings', mappingsPath, 5);
  }

  /**
   * [setContainer description]
   * @param {[type]} container [description]
   */
  setContainer(container) {
    this.panelContainer = container;
    this.panel.svgContainer = container;
  }

  // determine the width of a panel by the span and viewport
  getPanelWidthBySpan() {
    var trueWidth = 0;
    if (typeof this.panel.span === 'undefined') {
      // get the width based on the scaled container (v5 needs this)
      trueWidth = this.panelContainer.offsetParent.clientWidth;
    } else {
      // v4 and previous used fixed spans
      var viewPortWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
      // get the pixels of a span
      var pixelsPerSpan = viewPortWidth / 12;
      // multiply num spans by pixelsPerSpan
      trueWidth = Math.round(this.panel.span * pixelsPerSpan);
    }
    return trueWidth;
  }

  getPanelHeight() {
    // panel can have a fixed height set via "General" tab in panel editor
    var tmpPanelHeight = this.panel.height;
    if ((typeof tmpPanelHeight === 'undefined') || (tmpPanelHeight === "")) {
      // grafana also supplies the height, try to use that if the panel does not have a height
      tmpPanelHeight = String(this.height);
      // v4 and earlier define this height, detect span for pre-v5
      if (typeof this.panel.span != 'undefined') {
        // if there is no header, adjust height to use all space available
        var panelTitleOffset = 20;
        if (this.panel.title !== "") {
          panelTitleOffset = 42;
        }
        tmpPanelHeight = String(this.containerHeight - panelTitleOffset); // offset for header
      }
      if (typeof tmpPanelHeight === 'undefined') {
        // height still cannot be determined, get it from the row instead
        tmpPanelHeight = this.row.height;
        if (typeof tmpPanelHeight === 'undefined') {
          // last resort - default to 250px (this should never happen)
          tmpPanelHeight = "250";
        }
      }
    }
    // replace px
    tmpPanelHeight = tmpPanelHeight.replace("px","");
    // convert to numeric value
    var actualHeight = parseInt(tmpPanelHeight);
    return actualHeight;
  }

  clearSVG() {
    if ($('#'+this.panel.bulletDivId).length) {
      //console.log("Clearing SVG id: " + this.panel.bulletDivId);
      $('#'+this.panel.bulletDivId).remove();
    }
  }

  renderBullet() {
    // update the values to be sent to the bullet constructor
    this.setValues(this.data);
    if ($('#'+this.panel.bulletDivId).length) {
      $('#'+this.panel.bulletDivId).remove();
    }
    $('.bullet').remove();
    this.panelWidth = this.getPanelWidthBySpan();
    this.panelHeight = this.getPanelHeight();
    console.log(this.panelWidth);
    console.log(this.panelHeight);
    var data = this.bulletsData;
    var margin = {top: 10, right: 40, bottom: 40, left: 120};
    var width = this.panelWidth - margin.left - margin.right;
    var height = this.panelHeight/data.length - margin.top - margin.bottom;
    // set the width and height to be double the radius

    if(this.panel.bullet.rangesColor.length === 0){
      this.rangeColChange();
    }
    if(this.panel.bullet.measuresColor.length === 0){
      this.measureColChange();
    }
    var chart = d3.bullet()
      .width(width)
      .height(height)
      .options(this.panel.bullet);

    this.svg = d3.select("#" + this.containerDivId).selectAll("svg")
        .data(data)
      .enter().append("svg")
        .attr("class", "bullet")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .call(chart);

    var title = this.svg.append("g")
        .style("text-anchor", "end")
        .attr("transform", "translate(-6," + height / 2 + ")");

    title.append("text")
        .attr("class", "title")
        .attr("font-family", this.panel.bullet.titleFont)
        .attr("font-size", this.panel.bullet.titleFontSize + "px")
        .attr("fill", this.panel.bullet.titleCol)
        .text(function(d) { return d.title; });

    title.append("text")
        .attr("class", "subtitle")
        .attr("font-family", this.panel.bullet.subtitleFont)
        .attr("font-size", this.panel.bullet.subtitleFontSize + "px")
        .attr("fill", this.panel.bullet.subtitleCol)
        .attr("dy", "1em")
        .text(function(d) { return d.subtitle; });

    d3.selectAll("button").on("click", function() {
      this.svg.datum(randomize).call(chart.duration(1000)); // TODO automatic transition
    });
  }
  randomize(d) {
    if (!d.randomizer) d.randomizer = randomizer(d);
    d.ranges = d.ranges.map(d.randomizer);
    d.markers = d.markers.map(d.randomizer);
    d.measures = d.measures.map(d.randomizer);
    return d;
  }

  randomizer(d) {
    var k = d3.max(d.ranges) * 0.2;
    return function(d) {
      return Math.max(0, d + k * (Math.random() - 0.5));
    };
  }

  getRandomColor(color) {
    var p = 1,temp,random = Math.random(),result = '#';
    while (p < color.length) {
      temp = parseInt(color.slice(p, p += 2), 16);
      temp += Math.floor((255 - temp) * random);
      result += temp.toString(16).padStart(2, '0');
    }
    return result;
  }

  rangeColChange(){
    var rangesColor = [];
    var color = this.panel.bullet.rangeCol;
    for (var i = 0; i < 30; i++) {
      rangesColor.push(this.getRandomColor(color));
    }
    if(this.panel.bullet.rangesColor.length > 0){
      this.panel.bullet.rangesColor = rangesColor;
      this.render();
    }
    else{
      this.panel.bullet.rangesColor = rangesColor;
    }
  }

  measureColChange(){
    var color = this.panel.bullet.measureCol;
    var measuresColor = [];
    for (var i = 0; i < 30; i++) {
      measuresColor.push(this.getRandomColor(color));
    }
    if(this.panel.bullet.measuresColor.length > 0){
      this.panel.bullet.measuresColor = measuresColor;
      this.render();
    }
    else{
      this.panel.bullet.measuresColor = measuresColor;
    }
  }

  removeValueMap(map) {
    var index = _.indexOf(this.panel.valueMaps, map);
    this.panel.valueMaps.splice(index, 1);
    this.render();
  }

  addValueMap() {
    this.panel.valueMaps.push({value: '', op: '=', text: '' });
  }

  removeRangeMap(rangeMap) {
    var index = _.indexOf(this.panel.rangeMaps, rangeMap);
    this.panel.rangeMaps.splice(index, 1);
    this.render();
  }

  addRangeMap() {
    this.panel.rangeMaps.push({from: '', to: '', text: ''});
  }

  addTickMap() {
    this.panel.tickMaps.push({value: 0, text: ''});
  }
  removeTickMap(tickMap) {
    var index = _.indexOf(this.panel.tickMaps, tickMap);
    this.panel.tickMaps.splice(index, 1);
    this.render();
  }

  /**
   * Ensure the min value is less than the max value, auto-adjust as needed
   * @return void
   */
  validateLimitsMinValue() {
    if (this.panel.bullet.minValue >= this.panel.bullet.maxValue) {
      // set the maxValue to be the same as the minValue+1
      this.panel.bullet.maxValue = this.panel.bullet.minValue + 1;
      this.alertSrvRef.set("Problem!", "Minimum Value cannot be equal to or greater than Max Value, auto-adjusting Max Value to Minimum+1 (" + this.panel.bullet.maxValue + ")", 'warning', 10000);
    }
    this.render();
  }

  /**
   * Ensure the max value is greater than the min value, auto-adjust as needed
   * @return void
   */
  validateLimitsMaxValue() {
    if (this.panel.bullet.maxValue <= this.panel.bullet.minValue) {
      // set the minValue to be the same as the maxValue-1
      this.panel.bullet.minValue = this.panel.bullet.maxValue - 1;
      this.alertSrvRef.set("Problem!", "Maximum Value cannot be equal to or less than Min Value, auto-adjusting Min Value to Maximum-1 (" + this.panel.bullet.minValue + ")", 'warning', 10000);
    }
    this.render();
  }

  validateTransitionValue() {
    if (this.panel.bullet.animateNeedleValueTransitionSpeed === null) {
      this.panel.bullet.animateNeedleValueTransitionSpeed = 100;
    }
    if (this.panel.bullet.animateNeedleValueTransitionSpeed < 0) {
      this.panel.bullet.animateNeedleValueTransitionSpeed = 0;
    }
    if (this.panel.bullet.animateNeedleValueTransitionSpeed > 60000) {
      this.panel.bullet.animateNeedleValueTransitionSpeed = 60000;
    }
    this.render();
  }

  // sanity check for tick degree settings
  validateBulletTickDegreeValues() {
    if ((this.panel.bullet.zeroTickAngle === null) ||
        (this.panel.bullet.zeroTickAngle === "") ||
        (this.panel.bullet.zeroTickAngle < 0) ||
        (isNaN(this.panel.bullet.zeroTickAngle))
      ){
      // alert about the error, and set it to 60
      this.panel.bullet.zeroTickAngle = 60;
      this.alertSrvRef.set("Problem!", "Invalid Value for Zero Tick Angle, auto-setting to default of 60", 'error', 10000);
    }

    if ((this.panel.bullet.maxTickAngle === null) ||
        (this.panel.bullet.maxTickAngle === "") ||
        (this.panel.bullet.maxTickAngle < 0) ||
        (isNaN(this.panel.bullet.maxTickAngle))
      ){
      // alert about the error, and set it to 320
      this.panel.bullet.maxTickAngle = 320;
      this.alertSrvRef.set("Problem!", "Invalid Value for Max Tick Angle, auto-setting to default of 320", 'error', 10000);
    }

    var bulletTickDegrees = this.panel.bullet.maxTickAngle - this.panel.bullet.zeroTickAngle;
    // make sure the total degrees does not exceed 360
    if (bulletTickDegrees > 360) {
      // set to default values and alert
      this.panel.bullet.zeroTickAngle = 60;
      this.panel.bullet.maxTickAngle = 320;
      this.alertSrvRef.set("Problem!", "Bullet tick angle difference is larger than 360 degrees, auto-setting to default values", 'error', 10000);
    }
    // make sure it is "positive"
    if (bulletTickDegrees < 0) {
      // set to default values and alert
      this.panel.bullet.zeroTickAngle = 60;
      this.panel.bullet.maxTickAngle = 320;
      this.alertSrvRef.set("Problem!", "Bullet tick angle difference is less than 0 degrees, auto-setting to default values", 'error', 10000);
    }

    // render
    this.render();
  }

  // sanity check for Needle degree settings
  validateBulletNeedleDegreeValues() {
    if ((this.panel.bullet.zeroNeedleAngle === null) ||
        (this.panel.bullet.zeroNeedleAngle === "") ||
        (this.panel.bullet.zeroNeedleAngle < 0) ||
        (isNaN(this.panel.bullet.zeroNeedleAngle))
      ){
      // alert about the error, and set it to 60
      this.panel.bullet.zeroNeedleAngle = 60;
      this.alertSrvRef.set("Problem!", "Invalid Value for Zero Needle Angle, auto-setting to default of 60", 'error', 10000);
    }

    if ((this.panel.bullet.maxNeedleAngle === null) ||
        (this.panel.bullet.maxNeedleAngle === "") ||
        (this.panel.bullet.maxNeedleAngle < 0) ||
        (isNaN(this.panel.bullet.maxNeedleAngle))
      ){
      // alert about the error, and set it to 320
      this.panel.bullet.maxNeedleAngle = 320;
      this.alertSrvRef.set("Problem!", "Invalid Value for Max Needle Angle, auto-setting to default of 320", 'error', 10000);
    }

    var bulletNeedleDegrees = this.panel.bullet.maxNeedleAngle - this.panel.bullet.zeroNeedleAngle;
    // make sure the total degrees does not exceed 360
    if (bulletNeedleDegrees > 360) {
      // set to default values and alert
      this.panel.bullet.zeroNeedleAngle = 60;
      this.panel.bullet.maxNeedleAngle = 320;
      this.alertSrvRef.set("Problem!", "Bullet needle angle difference is larger than 360 degrees, auto-setting to default values", 'error', 10000);
    }
    // make sure it is "positive"
    if (bulletNeedleDegrees < 0) {
      // set to default values and alert
      this.panel.bullet.zeroNeedleAngle = 60;
      this.panel.bullet.maxNeedleAngle = 320;
      this.alertSrvRef.set("Problem!", "Bullet needle angle difference is less than 0 degrees, auto-setting to default values", 'error', 10000);
    }

    // render
    this.render();
  }

  validateRadialMetricValues() {
    // make sure the spacing values are valid
    if ((this.panel.bullet.tickSpaceMinVal === null) ||
        (this.panel.bullet.tickSpaceMinVal === "") ||
        (isNaN(this.panel.bullet.tickSpaceMinVal))
      ){
      // alert about the error, and set it to 1
      this.panel.bullet.tickSpaceMinVal = 1;
      this.alertSrvRef.set("Problem!", "Invalid Value for Tick Spacing Minor, auto-setting back to default of 1", 'error', 10000);
    }
    if ((this.panel.bullet.tickSpaceMajVal === null) ||
        (this.panel.bullet.tickSpaceMajVal === "") ||
        (isNaN(this.panel.bullet.tickSpaceMajVal))
      ){
      // alert about the error, and set it to 10
      this.panel.bullet.tickSpaceMajVal = 10;
      this.alertSrvRef.set("Problem!", "Invalid Value for Tick Spacing Major, auto-setting back to default of 10", 'error', 10000);
    }
    if ((this.panel.bullet.bulletRadius === null) ||
        (this.panel.bullet.bulletRadius === "") ||
        (isNaN(this.panel.bullet.bulletRadius) ||
        (this.panel.bullet.bulletRadius < 0))
      ){
      // alert about the error, and set it to 0
      this.panel.bullet.bulletRadius = 0;
      this.alertSrvRef.set("Problem!", "Invalid Value for Bullet Radius, auto-setting back to default of 0", 'error', 10000);
    }
    this.render();
  }

  link(scope, elem, attrs, ctrl) {
    //console.log("d3bullet inside link");
    var bulletByClass = elem.find('.grafana-d3-bullet');
    //bulletByClass.append('<center><div id="'+ctrl.containerDivId+'"></div></center>');
    bulletByClass.append('<div id="'+ctrl.containerDivId+'"></div>');
    var container = bulletByClass[0].childNodes[0];
    ctrl.setContainer(container);
    function render() {
      ctrl.renderBullet();
    }
    this.events.on('render', function() {
      render();
      ctrl.renderingCompleted();
    });
  }

  getDecimalsForValue(value) {
    if (_.isNumber(this.panel.decimals)) {
      return {decimals: this.panel.decimals, scaledDecimals: null};
    }

    var delta = value / 2;
    var dec = -Math.floor(Math.log(delta) / Math.LN10);

    var magn = Math.pow(10, -dec),
        norm = delta / magn, // norm is between 1.0 and 10.0
        size;

    if (norm < 1.5) {
      size = 1;
    } else if (norm < 3) {
      size = 2;
      // special case for 2.5, requires an extra decimal
      if (norm > 2.25) {
        size = 2.5;
        ++dec;
      }
    } else if (norm < 7.5) {
      size = 5;
    } else {
      size = 10;
    }

    size *= magn;

    // reduce starting decimals if not needed
    if (Math.floor(value) === value) { dec = 0; }

    var result = {};
    result.decimals = Math.max(0, dec);
    result.scaledDecimals = result.decimals - Math.floor(Math.log(size) / Math.LN10) + 2;
    return result;
  }

  setValues(data) {
    var columns = [];
    var bulletsData = [];
    if(!this.series.columns)
      return;
    if(this.series.columns.length > 0){
      for(var i = 0; i < this.series.columns.length; i++){
        columns.push(this.series.columns[i].text);
      }
      for(i = 0; i < this.series.rows.length; i++){
        bulletsData.push({});
        for(var j = 0; j < columns.length; j++){
          if(columns[j] == "ranges" || columns[j] == "measures" || columns[j] == "markers")
            bulletsData[i][columns[j]] = JSON.parse(this.series.rows[i][j]);
          else
            bulletsData[i][columns[j]] = this.series.rows[i][j];
        }
      }
      data.bullets = bulletsData;
    }
  }

  getValueText() {
    return this.data.valueFormatted;
  }

  getValueRounded() {
    return this.data.valueRounded;
  }

  setUnitFormat(subItem) {
    this.panel.format = subItem.value;
    this.render();
  }

  onDataError(err) {
    this.onDataReceived([]);
  }
  parseSeries(series) {
    return _.map(this.series, (serie, i) => {
      return {
        title: serie.alias,
        subtitle:serie.alias,
        ranges: [parseInt(serie.stats.min.toFixed(2)), parseInt(serie.stats.max.toFixed(2))- parseInt(serie.stats.range.toFixed(2))/2 ,parseInt(serie.stats.max.toFixed(2))],
        measures:[parseInt(serie.stats.min.toFixed(2)) + parseInt(serie.stats.range.toFixed(2))/3, parseInt(serie.stats.min.toFixed(2)) + parseInt(serie.stats.range.toFixed(2))/3*2],
        markers:[parseInt(serie.stats.avg.toFixed(2))]
      };
    });
  }
  onDataReceived(dataList) {
    this.series = dataList.map(this.seriesHandler.bind(this));
    var data = {};
    this.bulletsData = this.parseSeries(this.series);
    if(this.bulletObject !== null){
      this.bulletObject.updateBullet(data.value, data.valueFormatted, data.valueRounded);
    } else {
      // render bullet
      this.render();
    }
  }

  seriesHandler(seriesData) {
    var series = new TimeSeries({
      datapoints: seriesData.datapoints,
      alias: seriesData.target,
    });
    series.flotpairs = series.getFlotPairs(this.panel.nullPointMode);
    return series;
  }

  invertColorOrder() {
    var tmp = this.panel.colors[0];
    this.panel.colors[0] = this.panel.colors[2];
    this.panel.colors[2] = tmp;
    this.render();
  }
}

function getColorForValue(data, value) {
  for (var i = data.thresholds.length; i > 0; i--) {
    if (value >= data.thresholds[i-1]) {
      return data.colorMap[i];
    }
  }
  return _.first(data.colorMap);
}

D3BulletPanelCtrl.templateUrl = 'partials/template.html';
export {
  D3BulletPanelCtrl,
  D3BulletPanelCtrl as MetricsPanelCtrl
};
