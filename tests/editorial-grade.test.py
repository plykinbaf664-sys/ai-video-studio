"""Meaningful SDR shoulder regression, runnable without a renderer or ASR."""
import sys, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import numpy as np
from lib.editorial_grade import grade_rgb

class GradeTests(unittest.TestCase):
    def setUp(self):
        self.profile={'gamma':1,'contrast':1,'saturation':1,'rgbGain':[1,1,1]}
    def test_legacy_neutral_is_byte_exact(self):
        rgb=np.random.default_rng(12).integers(0,256,(16,32,3),dtype=np.uint8)
        np.testing.assert_array_equal(grade_rgb(rgb,self.profile),rgb)
    def test_highlight_ramp_is_monotonic_with_headroom_and_untouched_shadows(self):
        ramp=np.repeat(np.arange(256,dtype=np.uint8)[None,:,None],3,axis=2)
        graded=grade_rgb(ramp,{**self.profile,'highlightShoulder':{'knee':.72,'strength':.28}})
        self.assertTrue(np.all(np.diff(graded.astype(int),axis=1)>=0))
        np.testing.assert_array_equal(graded[:,:180],ramp[:,:180])
        self.assertLess(int(graded[0,-1,0]),255)
        self.assertGreater(int(graded[0,-1,0]),225)
    def test_invalid_shoulders_fail(self):
        for knee,strength in [(0,.28),(1,.28),(.72,-1),(.72,.5)]:
            with self.assertRaises(ValueError):grade_rgb(np.ones((1,1,3),dtype=np.uint8),{**self.profile,'highlightShoulder':{'knee':knee,'strength':strength}})

if __name__=='__main__':unittest.main()
