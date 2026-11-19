#!/usr/bin/env node
/*
 * 把 vendor 里的全部 SVG 拼成一个自包含的栅格化页面 vendor/rasterize-gen.html。
 * 用法：node tools/import-icons/build-page.js
 * 然后：Chrome --headless --dump-dom --virtual-time-budget=120000 该页面 > vendor/raster-out.html
 */
'use strict'

var fs = require('fs')
var path = require('path')

var DIR = path.join(__dirname, 'vendor', 'bootstrap-icons-1.13.2')
var files = fs.readdirSync(DIR).filter(function (f) { return /\.svg$/.test(f) })

var icons = files.map(function (f) {
  return {
    name: f.replace(/\.svg$/, ''),
    svg: fs.readFileSync(path.join(DIR, f), 'utf8')
  }
})

var lib = fs.readFileSync(path.join(__dirname, 'raster-lib.js'), 'utf8')

var html = '<!doctype html><meta charset="utf-8"><title>rasterize</title><body>\n' +
  '<script>var ICONS = ' + JSON.stringify(icons) + ';</script>\n' +
  '<script>' + lib + '</script>\n' +
  '</body>'

var outPath = path.join(__dirname, 'vendor', 'rasterize-gen.html')
fs.writeFileSync(outPath, html)
console.log('✓ 生成 ' + outPath + '，共 ' + icons.length + ' 个图标')
