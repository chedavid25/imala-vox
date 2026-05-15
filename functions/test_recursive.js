const fs = require('fs');

try {
  const content = fs.readFileSync('ng_state_dump.json', 'utf8');
  const d = JSON.parse(content);
  
  let dataObj = null;

  // Search recursively for "price" or "dimensionTotalBuilt" in any object
  function searchPropertyData(obj) {
      if (!obj || typeof obj !== 'object') return null;
      if (obj.price !== undefined || obj.dimensionTotalBuilt !== undefined || obj.bathrooms !== undefined) {
          // If it has these, it's the property object!
          // But wait, it might be a nested object inside a bigger one. 
          // Let's just return it.
          return obj;
      }
      for (const key of Object.keys(obj)) {
          const res = searchPropertyData(obj[key]);
          if (res) return res;
      }
      return null;
  }

  for (const key in d) {
      const val = d[key]?.b?.data || d[key]?.b || d[key];
      const found = searchPropertyData(val);
      if (found && found.price) {
          dataObj = found;
          break;
      }
  }

  console.log('Found dataObj:', !!dataObj);
  if (dataObj) {
      console.log('Price:', dataObj.price);
      console.log('Description:', dataObj.description?.slice(0, 100));
      console.log('M2:', dataObj.dimensionTotalBuilt);
      console.log('Bathrooms:', dataObj.bathrooms);
  }
} catch (e) {
  console.log('Error', e);
}
