var staticAutoComplete = {};
staticAutoComplete["metric"] = ' \
<div class="option"><a name="metric"></a><b>metric</b><br> \
  <p>The name of the metric that is monitored</p> \
  <i><span class="dyDescType">Type:</span> string</i><br> \
  <i><span class="dyDescType">Default:</span> (none)</i><p></p> \
  <span class="dyDescType">Gallery Samples:</span> <font color="red">NONE</font><br> \
  <span class="dyDescType">Other Examples:</span> <font color="red">NONE</font><br> \
  <br> </div> \
';
 
staticAutoComplete["duration"] = ' \
<div class="option"><a name="duration"></a><b>duration</b><br> \
  <p>The amount of seconds that should be sampled each time</p> \
  <i><span class="dyDescType">Type:</span> integer</i><br> \
  <i><span class="dyDescType">Default:</span> 300</i><p></p> \
  <span class="dyDescType">Gallery Samples:</span> <font color="red">NONE</font><br> \
  <span class="dyDescType">Other Examples:</span> <font color="red">NONE</font><br> \
  <br> </div> \
';
 
staticAutoComplete["aggregation"] = ' \
<div class="option"><a name="aggregation"></a><b>aggregation</b><br> \
  <p>The aggregative to check for over the period specified</p> \
  <i><span class="dyDescType">Type:</span> string "$avg","$max","$min","$sum" </i><br> \
  <i><span class="dyDescType">Default:</span> "$avg"</i><p></p> \
  <span class="dyDescType">Gallery Samples:</span> <font color="red">NONE</font><br> \
  <span class="dyDescType">Other Examples:</span> <font color="red">NONE</font><br> \
  <br> </div> \
';
 
staticAutoComplete["condition"] = ' \
<div class="option"><a name="condition"></a><b>condition</b><br> \
  <p>A mongo expression as json object consists of operator as key and operand as value</p> \
  <i><span class="dyDescType">Type:</span> object such as { "$lt": 5 } </i><br> \
  <i><span class="dyDescType">Default:</span> (none)</i><p></p> \
  <span class="dyDescType">Gallery Samples:</span> <font color="red">NONE</font><br> \
  <span class="dyDescType">Other Examples:</span> <font color="red">NONE</font><br> \
  <br> </div> \
';
 
staticAutoComplete["excludeServers"] = ' \
<div class="option"><a name="excludeServers"></a><b>excludeServers</b><br> \
  <p>An array of regex matches that exclude servers from being alerted upon in this alert</p> \
  <i><span class="dyDescType">Type:</span> array of regex strings</i><br> \
  <i><span class="dyDescType">Default:</span> []</i><p></p> \
  <span class="dyDescType">Gallery Samples:</span> <font color="red">NONE</font><br> \
  <span class="dyDescType">Other Examples:</span> <font color="red">NONE</font><br> \
  <br> </div> \
';
 
staticAutoComplete["enabled"] = ' \
<div class="option"><a name="enabled"></a><b>enabled</b><br> \
  <p>Allows disabling alerts without removing them by simply setting enabled to false</p> \
  <i><span class="dyDescType">Type:</span> boolean</i><br> \
  <i><span class="dyDescType">Default:</span> true</i><p></p> \
  <span class="dyDescType">Gallery Samples:</span> <font color="red">NONE</font><br> \
  <span class="dyDescType">Other Examples:</span> <font color="red">NONE</font><br> \
  <br> </div> \
';
 
staticAutoComplete["noMail"] = ' \
<div class="option"><a name="noMail"></a><b>noMail</b><br> \
  <p>Allows disabling alert notification via mail. Should be used in combination with other forms of alerting</p> \
  <i><span class="dyDescType">Type:</span> boolean</i><br> \
  <i><span class="dyDescType">Default:</span> true</i><p></p> \
  <span class="dyDescType">Gallery Samples:</span> <font color="red">NONE</font><br> \
  <span class="dyDescType">Other Examples:</span> <font color="red">NONE</font><br> \
  <br> </div> \
';

staticAutoComplete["minutesBetweenAlerts"] = ' \
<div class="option"><a name="minutesBetweenAlerts"></a><b>minutesBetweenAlerts</b><br> \
  <p>A silence period once an alert had occured to prevent further alerting during that time</p> \
  <i><span class="dyDescType">Type:</span> integer</i><br> \
  <i><span class="dyDescType">Default:</span> 1</i><p></p> \
  <span class="dyDescType">Gallery Samples:</span> <font color="red">NONE</font><br> \
  <span class="dyDescType">Other Examples:</span> <font color="red">NONE</font><br> \
  <br> </div> \
';
 
staticAutoComplete["description"] = ' \
<div class="option"><a name="description"></a><b>description</b><br> \
  <p>A short sentence which describes what it means when the alert is fired</p> \
  <i><span class="dyDescType">Type:</span> string</i><br> \
  <i><span class="dyDescType">Default:</span> warning message about this missing attribute</i><p></p> \
  <span class="dyDescType">Gallery Samples:</span> <font color="red">NONE</font><br> \
  <span class="dyDescType">Other Examples:</span> <font color="red">NONE</font><br> \
  <br> </div> \
';

staticAutoComplete["mailTo"] = ' \
<div class="option"><a name="noMail"></a><b>noMail</b><br> \
  <p>Allows overriding default mail receipients by specifying per-alert email</p> \
  <i><span class="dyDescType">Type:</span> string</i><br> \
  <i><span class="dyDescType">Default:</span> null</i><p></p> \
  <span class="dyDescType">Gallery Samples:</span> <font color="red">NONE</font><br> \
  <span class="dyDescType">Other Examples:</span> <font color="red">NONE</font><br> \
  <br> </div> \
';