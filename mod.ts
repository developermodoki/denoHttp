import { serve } from "https://deno.land/std@0.120.0/http/server.ts";

interface ResponseType<T> {
  text:T,
  header?: Headers | null,
  status?:number | null,
}
const handle:{urlName:string, handler: (req:Request) => Promise<ResponseType<any>> | ResponseType<any>, pattern?:URLPattern}[] = [];
const middleware:{fn:(req:Request) => void | {res:unknown} | Promise<{res:unknown} | void>}[] = []
const globalHeaders:Headers | {} = {};

class Server {
  constructor(){}

  set(handler: (req:Request) => void | {res:unknown} | Promise<{res:unknown} | void>) {
    middleware.push({fn:handler});
  }

  on(urlName:string, handler: (req:Request) => ResponseType<unknown> | Promise<ResponseType<unknown>>):void {
    const pattern:URLPattern = new URLPattern({pathname:urlName})
    handle.push({urlName, handler, pattern});
    console.log(handle);
  }

  setGlobalHeaders(headers:Headers):void {
    Object.assign(globalHeaders,headers);
  }

  async handler(req: Request): Promise<Response> {
    if(middleware.length !== 0){
      let reject: undefined | {res:any} = undefined;
      for await (const u of middleware) {
        const res = await u.fn(req);
        if(res !== undefined) {
          reject = res;
          break;
        }
      }
      if(reject) return new Response(reject.res);
    } 
    if(handle.length !== 0) {
      for await(const i of handle) {
        if(i.pattern?.exec(new URL(req.url).href) !== null){
          try { 
            const pendingRes = await i.handler(req);  
            return new Response(pendingRes.text, {
              status:(pendingRes.status ? pendingRes.status : 200),
              headers: (pendingRes.header ? Object.assign(pendingRes.header,globalHeaders) : Object.assign({"content-type": "application/json"},globalHeaders))
            });
          } catch(e) {
            console.error(e); return new Response("error"); 
          }
        } else {
          return new Response("Not Found",{status:404});
        }
      }
      return new Response("Not Found",{status:404});
    } else {
      return new Response("Erorr: handlers length is 0",{status:400});
    }
  }

  async listen():Promise<void> {
    await serve(this.handler)
  }
}
const app = new Server();

app.on("/testing/:vovid",(req): ResponseType<string> => {
  console.log((req.text()))
  console.log(req.headers)
  return {text:"waa"}
})
app.listen();