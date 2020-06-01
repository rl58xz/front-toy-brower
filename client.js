const net = require('net');

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

const client = net.createConnection(
    {
    host:"127.0.0.1",
    port:8088
    },
    ()=>{
        console.log('connected to server!');
        // client.write('GET / HTTP/1.1\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Lenth:11\r\n\r\nname=winter');
        // client.write('\r\n');
        let request = new Request({
            method:'POST',
            host: '127.0.0.1',
            port: '8088',
            path: '/',
            body: {
                name:'winter'
            }
        });
        console.log(request.toString());
    }
);

client.on('data',(data) => {
    console.log(data.toString());
    client.end();
});
client.on('end', ()=>{
    console.log('disconnect from server');
})

client.on('error', (err)=>{
    console.log(err);
    client.end();
})

class Request{
    constructor(options){
        this.method = options.method || "GET";
        this.host = options.host;
        this.port = options.port || 80;
        this.path = options.path || '/';
        this.body = options.body || {};
        this.headers = options.headers || {};
        if(!this.headers["Content-Type"]){
            this.headers["Content-type"] = "application/x-www-form-urlencoded"
        }
        if(this.headers["Content-Type"] === "application/json"){
            this.bodyText = JSON.stringify(this.body);
        }else if(this.headers["Content-Type"] === "application/x-www-form-urlencoded"){
            this.bodyText = Object.keys(this.body).map(key => `${key} = ${encodeURIComponent(this.body[key])}`).join('&');
        }
        this.headers["Content-length"] = this.bodyText.length;
    }
    toString(){
        return `${this.method} ${this.path} HTTP/1.1\r
        ${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r
        \r
        ${this.bodyText}
        `;
    }
    open(method,url){}
    send(){}
}

class Response {
}