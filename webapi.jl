include("simple.jl")
using Genie, Genie.Renderer.Json, Genie.Requests, HTTP
using UUIDs

instances = isdefined(@__MODULE__, :instances) ? instances : Dict{String, Any}()

serialize_car(car) = Dict(
    "id"  => car.id,
    "pos" => [car.pos[1], car.pos[2]],
    "vel" => [car.vel[1], car.vel[2]],
)

serialize_cars(model) = [serialize_car(car) for car in allagents(model)]

route("/simulations", method = POST) do
    model = initialize_model()
    id = string(uuid1())
    instances[id] = model
    return json(Dict(
        "Location" => "/simulations/$id",
        "cars"     => serialize_cars(model)
    ))
end

route("/simulations/:id") do
    sim_id = payload(:id)
    if !haskey(instances, sim_id)
        return json(Dict("error" => "simulation not found"), status = 404)
    end
    model = instances[sim_id]
    run!(model, 1)
    return json(Dict("cars" => serialize_cars(model)))
end

Genie.config.run_as_server = true
Genie.config.cors_headers["Access-Control-Allow-Origin"]  = "*"
Genie.config.cors_headers["Access-Control-Allow-Headers"] = "Content-Type"
Genie.config.cors_headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
Genie.config.cors_allowed_origins = ["*"]

up()
