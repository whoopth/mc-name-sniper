/**
 * Changelog:
 * Optimize requests per second.
 */

var request = require('request');
var fs = require('fs');

var proxies = fs.readFileSync('./checked_proxylist.txt','utf8');
proxies = proxies.split('\n');

authorizations = ['Bearer 0cdb3cb2e1374d66b6a5c9f249cb7622']

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';


function snipe(wanted_username, drop_time) { //TAKES CURRENT USERNAME
    let code = 'AAAA-BBBB-CCCC';
    let proxy_number = 0; //Keep track of which proxies have been used.
    let account_number = 0; //Keep track of which account is being used.
    let num_requests = 0; //Count the total number of requests sent.

    //Request 1: PUT
    let put_headers = {
        'Host': 'api.mojang.com',
        'Connection': 'keep-alive',
        'Accept': '*/*',
        'Origin': 'https://my.minecraft.net',
        'Authorization': authorizations[0],
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
        'Referer': 'https://my.minecraft.net/en-us/redeem/minecraft/',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9'
        //'Content-Length': '0'
    };

    var put_options = {
        url: 'https://api.mojang.com/user/profile/agent/minecraft/name/' + wanted_username,
        method: 'PUT',
        headers: put_headers,
        proxy: proxies[0]
    }; 

    //Requesting is done here
    function put_callback(error, response, body) {
        /**
        if (!error && response.statusCode == 204) {
            console.log(Date.now() + response.statusCode + ' Success' + account_number + '\n');
        } else {
            if (error) {
                console.log(Date.now() + ' Error. ' + error + '\n');
            } else {
                console.log(Date.now() + ' Unsuccessful. ' + response.statusCode + body + '\n');
            }
            
        }
        */
    }

    //Start sending requests
    let interval1;
    let delay = 1;
    let start_time = drop_time - Date.now();
    let timeout1 = setTimeout(function(){
        var date1 = new Date().getTime();
        console.log(date1);
        for(var i = 0; i < 10000; i++) {
            request(put_options, put_callback);
            num_requests++;

            //Change Proxies
            proxy_number++;
            if(proxy_number >= proxies.length) {proxy_number = 0;}
            put_options.proxy = 'http://' + proxies[proxy_number];

            //Change Accounts
            account_number++;
            if(account_number >= authorizations.length) {account_number = 0;}
            put_headers['Authorization'] = authorizations[account_number];
        }
        console.log(num_requests);
        var date2 = new Date().getTime();
        console.log(date2);
    }, start_time);

    //Stop sending requests
    //let end_time = new Date(drop_time + 1000 - Date.now());
    //let timeout2 = setTimeout(function(){
    //    console.log(Date.now() + ' Requests Ended');
    //}, end_time);
    
}

function getUUID(username) { //Takes the current username, gets UUID
    let thirty_eight_days = 86400000*38; //38 days in milliseconds
    let thirty_eight_days_ago = (Date.now()-thirty_eight_days);
    thirty_eight_days_ago = Math.round(thirty_eight_days_ago/1000)*1000;

    let eight_days = 86400000*8; //8 days in milliseconds
    let eight_days_ago = (Date.now()-eight_days);
    eight_days_ago = Math.round(eight_days_ago/1000)*1000;

    let current_username = username;

    let url = 'https://api.mojang.com/users/profiles/minecraft/'+ current_username + '?at=' + Date.now();

    let options = {
        url: url
    }

    function callback(error, response, body) {
        let UUID = body.substring(7,39);
        getNameHistory(UUID);
    }

    request(options, callback);
}

function getNameHistory(UUID) { //Gets name history
    let changed_at;
    let available_time;
    let url = 'https://api.mojang.com/user/profiles/' + UUID + '/names';
    let options = {
        url: url
    }

    function callback(error, response, body) {
        //WANTED USERNAME AND DROP TIME ARE FOUND HERE
        let wanted_username = findNameAndTime(body)[0]; //Extract desired username from name history
        let drop_time = findNameAndTime(body)[1]; //Extract drop time from name history
        console.log(wanted_username);
        console.log(drop_time);

        snipe(wanted_username, drop_time);
    }

    request(options, callback);
}

function findNameAndTime(body) {
    let new_body = body.replace(/[\[\]{}\"]+/g,'');
    new_body = new_body.split(',');

    //We are splitting the new_body into two arrays of names and change times so that we can find the wanted username and correct change time.
    let list_usernames = [];
    let list_change_times = [];

    for(let i = 0; i < new_body.length; i++) {
        if(new_body[i].substring(0,1) == 'n') { //Checks if the element is a name
            list_usernames.push(new_body[i].substring(5,new_body[i].length)); //Adds the name to an array.
        } else {
            list_change_times.push(new_body[i].substring(12, new_body[i].length)); //Adds the change time to an array.
        }
    }

    //We use the array of times to find the time of name change.
    //If the name change was more than eight days ago, then it is the correct one.
    let eight_days = 86400000*8; //eight days in milliseconds
    let eight_days_ago = Date.now()-eight_days; //eight days ago in UNIX
    let index;
    let thirty_seven_days = 86400000*37
    let time_error = -4000; //It seems that the computer's clock is 4 seconds off


    for(let i = list_change_times.length-1; i >= 0 ; i--) {
        if(Number(list_change_times[i]) < eight_days_ago) {  //If the name change was more than eight days ago, then it is the correct one.
            index = i;
            break;
        }
    }    

    let name_and_time = [list_usernames[index], Number(list_change_times[index])+thirty_seven_days+time_error];

    return name_and_time;

}

getUUID('ipatt');

process.on('uncaughtException', function(error){
    console.log('Uncaught Exception.');
})
