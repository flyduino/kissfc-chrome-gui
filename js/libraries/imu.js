// Code adapted from http://x-io.co.uk/open-source-ahrs-with-x-imu/
// By FedorComander

var SamplePeriod;
var Beta;
var Quaternion = [ 1.0, 0.0, 0.0, 0.0 ];

function imuInit(samplePeriod, beta)  {
    SamplePeriod = samplePeriod;
    Beta = beta;
    Quaternion = [ 1.0, 0.0, 0.0, 0.0 ];
}

        
function imuUpdate(gx, gy, gz, ax, ay, az)
        {
            var q1 = Quaternion[0], q2 = Quaternion[1], q3 = Quaternion[2], q4 = Quaternion[3];   // short
                                                                                                    // name
                                                                                                    // local
                                                                                                    // variable
                                                                                                    // for
                                                                                                    // readability
            var norm;
            var s1, s2, s3, s4;
            var qDot1, qDot2, qDot3, qDot4;

            // Auxiliary variables to avoid repeated arithmetic
            var _2q1 = 2.0 * q1;
            var _2q2 = 2.0 * q2;
            var _2q3 = 2.0 * q3;
            var _2q4 = 2.0 * q4;
            var _4q1 = 4.0 * q1;
            var _4q2 = 4.0 * q2;
            var _4q3 = 4.0 * q3;
            var _8q2 = 8.0 * q2;
            var _8q3 = 8.0 * q3;
            var q1q1 = q1 * q1;
            var q2q2 = q2 * q2;
            var q3q3 = q3 * q3;
            var q4q4 = q4 * q4;

            // Normalise accelerometer measurement
            norm = Math.sqrt(ax * ax + ay * ay + az * az);
            if (norm == 0.0) return; // handle NaN
            norm = 1 / norm;        // use reciprocal for division
            ax *= norm;
            ay *= norm;
            az *= norm;

            // Gradient decent algorithm corrective step
            s1 = _4q1 * q3q3 + _2q3 * ax + _4q1 * q2q2 - _2q2 * ay;
            s2 = _4q2 * q4q4 - _2q4 * ax + 4.0 * q1q1 * q2 - _2q1 * ay - _4q2 + _8q2 * q2q2 + _8q2 * q3q3 + _4q2 * az;
            s3 = 4.0 * q1q1 * q3 + _2q1 * ax + _4q3 * q4q4 - _2q4 * ay - _4q3 + _8q3 * q2q2 + _8q3 * q3q3 + _4q3 * az;
            s4 = 4.0 * q2q2 * q4 - _2q2 * ax + 4.0 * q3q3 * q4 - _2q3 * ay;
            norm = 1.0 / Math.sqrt(s1 * s1 + s2 * s2 + s3 * s3 + s4 * s4);    // normalise
                                                                                // step
                                                                                // magnitude
            s1 *= norm;
            s2 *= norm;
            s3 *= norm;
            s4 *= norm;

            // Compute rate of change of quaternion
            qDot1 = 0.5 * (-q2 * gx - q3 * gy - q4 * gz) - Beta * s1;
            qDot2 = 0.5 * (q1 * gx + q3 * gz - q4 * gy) - Beta * s2;
            qDot3 = 0.5 * (q1 * gy - q2 * gz + q4 * gx) - Beta * s3;
            qDot4 = 0.5 * (q1 * gz + q2 * gy - q3 * gx) - Beta * s4;

            // Integrate to yield quaternion
            q1 += qDot1 * SamplePeriod;
            q2 += qDot2 * SamplePeriod;
            q3 += qDot3 * SamplePeriod;
            q4 += qDot4 * SamplePeriod;
            norm = 1.0 / Math.sqrt(q1 * q1 + q2 * q2 + q3 * q3 + q4 * q4);    // normalise
                                                                                // quaternion
            Quaternion[0] = q1 * norm;
            Quaternion[1] = q2 * norm;
            Quaternion[2] = q3 * norm;
            Quaternion[3] = q4 * norm;
        }
