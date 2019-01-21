import {MetricsPanelCtrl} from 'app/plugins/sdk';
import _ from 'lodash';
import $ from 'jquery';
import TimeSeries from 'app/core/time_series2';

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
  colors: ["rgba(245, 54, 54, 0.9)", "rgba(237, 129, 40, 0.89)", "rgba(50, 172, 45, 0.97)"],
  bullet: {
    titleFontSize: 22,
    subtitleFontSize: 18,
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
    this.bulletsData =[];
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
}

D3BulletPanelCtrl.templateUrl = 'partials/template.html';
export {
  D3BulletPanelCtrl,
  D3BulletPanelCtrl as MetricsPanelCtrl
};
