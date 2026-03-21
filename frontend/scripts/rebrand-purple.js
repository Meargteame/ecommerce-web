#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

// Simple string replaceAll helper
function replaceAll(str, find, replace) {
  return str.split(find).join(replace)
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  const original = content

  // Hex colors
  content = replaceAll(content, '#f97316', '#7c3aed')
  content = replaceAll(content, '#fb923c', '#8b5cf6')
  content = replaceAll(content, '#ea580c', '#6d28d9')
  content = replaceAll(content, '#fdba74', '#c4b5fd')

  // Tailwind orange → violet (specific before general)
  content = replaceAll(content, 'orange-700', 'violet-800')
  content = replaceAll(content, 'orange-600', 'violet-700')
  content = replaceAll(content, 'orange-500', 'violet-600')
  content = replaceAll(content, 'orange-400', 'violet-500')
  content = replaceAll(content, 'orange-300', 'violet-300')
  content = replaceAll(content, 'orange-200', 'violet-200')
  content = replaceAll(content, 'orange-100', 'violet-100')
  content = replaceAll(content, 'orange-50',  'violet-50')

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log('Updated:', filePath.replace(path.join(__dirname, '..') + '/', ''))
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(entry.name)) continue
      walk(full)
    } else if (/\.(tsx|ts|css)$/.test(entry.name)) {
      processFile(full)
    }
  }
}

const root = path.join(__dirname, '..')
walk(path.join(root, 'app'))
walk(path.join(root, 'components'))
// Also hit globals.css
const globalsCss = path.join(root, 'app', 'globals.css')
if (fs.existsSync(globalsCss)) processFile(globalsCss)

console.log('Rebrand complete.')
