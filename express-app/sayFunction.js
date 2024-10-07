exports.handler = async (event) => {
    const keyword = event.queryStringParameters.keyword || 'no keyword provided';
    const response = {
        statusCode: 200,
        body: JSON.stringify({ message: `Tanvi says ${keyword}` }),
    };
    return response;
};
