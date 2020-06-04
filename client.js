const net = require('net');
class Request {
    constructor(options) {
        this.method = options.method || "GET";
        this.host = options.host;
        this.port = options.port || 80;
        this.path = options.path || '/';
        this.body = options.body || {};
        this.headers = options.headers || {};
        if (!this.headers["Content-Type"]) {
            this.headers['Content-Type'] = "application/x-www-form-urlencoded";
        }
        if (this.headers["Content-Type"] === "application/json") {
            this.bodyText = JSON.stringify(this.body);
        } else if (this.headers["Content-Type"] === "application/x-www-form-urlencoded") {
            this.bodyText = Object.keys(this.body).map(key => `${key} = ${encodeURIComponent(this.body[key])}`).join('&');
        }
        this.headers["Content-length"] = this.bodyText.length;
    }
    toString() {
        return `${this.method} ${this.path} HTTP/1.1\r\n${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r\n\r\n${this.bodyText}`;
    }
    open(method, url) { }
    send(connection) {
        return new Promise((resolve, reject) => {
            if (connection) {
                connection.write(this.toString());
            } else {
                connection = net.createConnection({
                    host: this.host,
                    port: this.port
                }, () => {
                    connection.write(this.toString());
                })
            }
            connection.on('data',(data) => {
                resolve(data.toString());
                connection.end();
            });
            connection.on('error', (err)=>{
                reject(err);
                connection.end();
            });
        });
    };
}

class Response {
}

void async function (){
    let request = new Request({
        method: 'POST',
        host: '127.0.0.1',
        port: '8099',
        path: '/',
        headers: {
            ["X-Foo2"]: "custom"
        },
        body: {
            name: 'winter'
        }
    });
    
   let response = await request.send();
   console.log(response);
}();


// net.connect({
//     host:"127.0.0.1",
//     port:8088,
//     onread:{
//         buffer:Buffer.alloc(4*1024),
//         callback:function(nread,buf){
//             console.log(buf.toString('utf8',0,nread));
//         }
//     }
// });

// const client = net.createConnection(
//     {
//     host:"127.0.0.1",
//     port:8099
//     },
//     ()=>{
//         console.log('connected to server!');
//         // client.write('GET / HTTP/1.1\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Lenth:11\r\n\r\nname=winter');
//         // client.write('\r\n');
//         let request = new Request({
//             method:'POST',
//             host: '127.0.0.1',
//             port: '8099',
//             path: '/',
//             headers:{
//                 ["X-Foo2"]:"custom"
//             },
//             body: {
//                 name:'winter'
//             }
//         });
//         console.log(request.toString());
//         client.write(request.toString());
//     }
// );

// client.on('data',(data) => {
//     console.log(data.toString());
//     client.end();
// });
// client.on('end', ()=>{
//     console.log('disconnect from server');
// })

// client.on('error', (err)=>{
//     console.log(err);
//     client.end();
// })
