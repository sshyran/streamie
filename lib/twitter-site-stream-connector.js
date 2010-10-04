var streamClient = require('./twitter-stream-client'),
    queue        = require('./message-queue'),
    config       = require('./config');

var SiteURL = "https://betastream.twitter.com/2/site.json";
var UserURL = "https://userstream.twitter.com/2/user.json";

function SiteStreamConnection(requester) {
  this.requester = requester;
  this.users     = ["183992483", "15534471"];
  this.connection = null;
}

SiteStreamConnection.prototype.connect = function () {
  
  var url = SiteURL + "?with=followings&follow="+encodeURIComponent(this.users.join(","));
  
  var connection = streamClient.connect(url, this.requester, function (err, data) {
    console.log("Site Stream response "+err+data)
    if(err) {
      open = false;
      console.log(err);
      if(!err.connection == "close") {
        connection.end();
      }
    } else {
      console.log(data);
    }
  });
  
  this.connection = connection;
}

SiteStreamConnection.prototype.addUser = function (id, requester) {
  if(this.users.indexOf(id) == -1) {
    this.users.push(id);
  }
  if(this.connection) {
    this.connection.end();
  }
  this.connect();
}

function UserStreamConnection() {
  this.users     = [];
  this.conID = 0;
}

SiteStreamConnection.prototype.connect = function () {};

UserStreamConnection.prototype.addUser = function (id, requester) {
  if(this.users.indexOf(id) == -1) {
    this.users.push(id);
    var conID = this.conID++;
    var connection = streamClient.connect(UserURL, requester, function (err, data) {
      console.log("Site Stream response "+err+data)
      if(err) {
        console.log(err);
        if(!err.connection == "close") {
          connection.end();
        }
        this.users = user.filter(function (u) {
          return u != id;
        })
      } else {
        try {
          var obj = JSON.parse(data);
        } catch(e) {
          console.log(""+e);
        }
        queue.publish("stream-"+id, obj)
      }
    });
  } else {
    console.log("User already connected "+id + " "+this.users);
  }
}

var userStreamConnection = new UserStreamConnection();
var siteStreamConnection = null;

function getConnection(cb) {
  oauth.reuse(key, secret, config.siteStreamOAuthToken, function (err, requester, info) {
    if(err) {
      console.log("Error during site stream oAuth retrieval. Falling back to user streams");
      cb(userStreamConnection)
    }
    console.log("Connecting as "+JSON.stringify(info));
    var connection = new SiteStreamConnection(requester);
    connection.connect();
    console.log("Attempted connection to site stream");
    cb(connection);
  })
  return siteStreamConnection || userStreamConnection;
}

exports.subscribe = function (userID, requester, subscriptionCB) {
  var connection = getConnection(function () {
    connection.addUser(userID, requester);
  });
  return queue.subscribe(["stream-"+userID], subscriptionCB);
}



/**/