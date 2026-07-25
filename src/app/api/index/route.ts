export async function GET(req: Request) {
  return Response.json({
    "message": "hello"
  })
}

export async function POST(req: Request) {
  return Response.json({
    "message": "Hello World"
  })
}
